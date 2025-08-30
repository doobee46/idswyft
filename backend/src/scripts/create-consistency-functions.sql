-- Create database function for atomic verification state updates
CREATE OR REPLACE FUNCTION update_verification_with_state_check(
  p_verification_id UUID,
  p_expected_states TEXT[],
  p_new_status TEXT,
  p_update_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- Lock the row and get current status
  SELECT status INTO current_status
  FROM verification_requests
  WHERE id = p_verification_id
  FOR UPDATE;
  
  -- Check if current state is valid for this transition
  IF current_status = ANY(p_expected_states) THEN
    -- Update with new data
    UPDATE verification_requests
    SET 
      status = p_new_status,
      face_match_score = COALESCE((p_update_data->>'face_match_score')::FLOAT, face_match_score),
      liveness_score = COALESCE((p_update_data->>'liveness_score')::FLOAT, liveness_score),
      cross_validation_score = COALESCE((p_update_data->>'cross_validation_score')::FLOAT, cross_validation_score),
      confidence_score = COALESCE((p_update_data->>'confidence_score')::FLOAT, confidence_score),
      manual_review_reason = COALESCE(p_update_data->>'manual_review_reason', manual_review_reason),
      failure_reason = COALESCE(p_update_data->>'failure_reason', failure_reason),
      updated_at = NOW()
    WHERE id = p_verification_id;
    
    RETURN TRUE;
  ELSE
    -- Invalid state transition
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to recalculate consistency scores
CREATE OR REPLACE FUNCTION recalculate_verification_consistency(
  p_verification_id UUID
) RETURNS TABLE (
  face_match_score FLOAT,
  liveness_score FLOAT,
  cross_validation_score FLOAT,
  confidence_score FLOAT,
  final_status TEXT
) AS $$
DECLARE
  v_verification verification_requests%ROWTYPE;
  v_document documents%ROWTYPE;
  v_back_document documents%ROWTYPE;
  v_is_sandbox BOOLEAN;
  v_face_threshold FLOAT;
  v_liveness_threshold FLOAT;
  v_confidence FLOAT;
  v_final_status TEXT;
BEGIN
  -- Get verification data
  SELECT * INTO v_verification
  FROM verification_requests
  WHERE id = p_verification_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found: %', p_verification_id;
  END IF;
  
  -- Get documents
  SELECT * INTO v_document
  FROM documents
  WHERE verification_request_id = p_verification_id
  AND (is_back_of_id IS NULL OR is_back_of_id = false)
  LIMIT 1;
  
  SELECT * INTO v_back_document
  FROM documents
  WHERE verification_request_id = p_verification_id
  AND is_back_of_id = true
  LIMIT 1;
  
  -- Determine thresholds based on sandbox mode
  v_is_sandbox := v_verification.is_sandbox;
  v_face_threshold := CASE WHEN v_is_sandbox THEN 0.8 ELSE 0.85 END;
  v_liveness_threshold := CASE WHEN v_is_sandbox THEN 0.65 ELSE 0.75 END;
  
  -- Calculate confidence score
  v_confidence := 0;
  IF v_verification.face_match_score IS NOT NULL THEN
    v_confidence := v_confidence + (v_verification.face_match_score * 0.4);
  END IF;
  
  IF v_verification.liveness_score IS NOT NULL THEN
    v_confidence := v_confidence + (v_verification.liveness_score * 0.3);
  END IF;
  
  IF v_verification.cross_validation_score IS NOT NULL THEN
    v_confidence := v_confidence + (v_verification.cross_validation_score * 0.2);
  END IF;
  
  -- Add document quality if available
  IF v_document.quality_analysis IS NOT NULL AND 
     (v_document.quality_analysis->>'overall_score')::FLOAT IS NOT NULL THEN
    v_confidence := v_confidence + ((v_document.quality_analysis->>'overall_score')::FLOAT * 0.1);
  END IF;
  
  -- Determine final status
  IF v_verification.manual_review_reason IS NOT NULL THEN
    v_final_status := 'manual_review';
  ELSIF (v_verification.face_match_score >= v_face_threshold AND 
         v_verification.liveness_score >= v_liveness_threshold AND
         (v_verification.cross_validation_score IS NULL OR v_verification.cross_validation_score >= 0.7)) THEN
    v_final_status := 'verified';
  ELSE
    v_final_status := 'failed';
  END IF;
  
  -- Update the verification record
  UPDATE verification_requests
  SET 
    confidence_score = v_confidence,
    status = v_final_status,
    updated_at = NOW()
  WHERE id = p_verification_id;
  
  -- Return results
  RETURN QUERY SELECT 
    v_verification.face_match_score,
    v_verification.liveness_score,
    v_verification.cross_validation_score,
    v_confidence,
    v_final_status;
END;
$$ LANGUAGE plpgsql;