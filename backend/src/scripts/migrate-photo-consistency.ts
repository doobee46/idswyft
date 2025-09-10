#!/usr/bin/env tsx

import { supabase } from '../database.js';

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

async function migratePhotoConsistency() {
  try {
    console.log('🔒 Running photo consistency security migration...');
    
    const migrations = [
      {
        name: 'Add photo_consistency_score column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS photo_consistency_score DECIMAL(3,2);`
      },
      {
        name: 'Add liveness_score column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS liveness_score DECIMAL(3,2);`
      },
      {
        name: 'Add live_capture_completed column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS live_capture_completed BOOLEAN DEFAULT FALSE;`
      },
      {
        name: 'Add failure_reason column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;`
      },
      {
        name: 'Add cross_validation_score column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS cross_validation_score DECIMAL(3,2);`
      },
      {
        name: 'Add confidence_score column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);`
      },
      {
        name: 'Add back_of_id_uploaded column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS back_of_id_uploaded BOOLEAN DEFAULT FALSE;`
      },
      {
        name: 'Add enhanced_verification_completed column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS enhanced_verification_completed BOOLEAN DEFAULT FALSE;`
      },
      {
        name: 'Add manual_review_reason column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;`
      },
      {
        name: 'Add external_verification_id column',
        sql: `ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS external_verification_id VARCHAR(255);`
      },
      {
        name: 'Create index for photo_consistency_score',
        sql: `CREATE INDEX IF NOT EXISTS idx_verification_requests_photo_consistency ON verification_requests(photo_consistency_score);`
      },
      {
        name: 'Create index for liveness_score',
        sql: `CREATE INDEX IF NOT EXISTS idx_verification_requests_liveness ON verification_requests(liveness_score);`
      },
      {
        name: 'Update status constraint',
        sql: `ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;`
      },
      {
        name: 'Add updated status constraint',
        sql: `ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check CHECK (status IN ('pending', 'verified', 'failed', 'manual_review'));`
      }
    ];
    
    console.log(`📝 Executing ${migrations.length} migration statements...`);
    
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      try {
        logger.info(`${i + 1}/${migrations.length} ${migration.name}...`);
        
        // Use rpc function if available, otherwise skip with warning
        const { error } = await supabase.rpc('exec_sql', { 
          sql: migration.sql 
        });
        
        if (error) {
          logger.warn(`Migration "${migration.name}" warning:`, error.message);
          // Log the SQL for manual execution
          logger.info(`📋 Manual SQL: ${migration.sql}`);
        } else {
          logger.info(`✅ ${migration.name} completed`);
        }
        
      } catch (error) {
        logger.warn(`Migration "${migration.name}" needs manual execution:`, error instanceof Error ? error.message : 'Unknown error');
        logger.info(`📋 Manual SQL: ${migration.sql}`);
      }
    }
    
    // Verify migration by checking if columns exist
    try {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'verification_requests')
        .in('column_name', [
          'photo_consistency_score',
          'liveness_score', 
          'live_capture_completed',
          'failure_reason',
          'cross_validation_score',
          'confidence_score',
          'back_of_id_uploaded',
          'enhanced_verification_completed'
        ]);
      
      if (columnsError) {
        logger.error('Failed to verify column creation:', columnsError);
      } else {
        logger.info(`✅ Verified ${columns?.length || 0} new columns exist`);
        columns?.forEach(column => {
          logger.info(`✓ Column: ${column.column_name}`);
        });
      }
    } catch (error) {
      logger.warn('Could not verify columns, but migration SQL was provided for manual execution');
    }
    
    logger.info('');
    logger.info('🔒 Photo consistency security migration completed!');
    logger.info('');
    logger.info('If any migrations failed, please run the provided SQL statements manually in your Supabase dashboard:');
    logger.info('1. Go to https://supabase.com/dashboard');
    logger.info('2. Navigate to your project > SQL Editor');
    logger.info('3. Execute the failed SQL statements shown above');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    logger.info('');
    logger.info('🔧 Manual migration SQL statements:');
    logger.info('');
    logger.info('-- Add security enhancement columns');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS photo_consistency_score DECIMAL(3,2);');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS liveness_score DECIMAL(3,2);');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS live_capture_completed BOOLEAN DEFAULT FALSE;');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS cross_validation_score DECIMAL(3,2);');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS back_of_id_uploaded BOOLEAN DEFAULT FALSE;');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS enhanced_verification_completed BOOLEAN DEFAULT FALSE;');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;');
    logger.info('ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS external_verification_id VARCHAR(255);');
    logger.info('');
    logger.info('-- Create indexes');
    logger.info('CREATE INDEX IF NOT EXISTS idx_verification_requests_photo_consistency ON verification_requests(photo_consistency_score);');
    logger.info('CREATE INDEX IF NOT EXISTS idx_verification_requests_liveness ON verification_requests(liveness_score);');
    logger.info('');
    logger.info('-- Update constraints');
    logger.info('ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;');
    logger.info('ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check CHECK (status IN (\'pending\', \'verified\', \'failed\', \'manual_review\'));');
    
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migratePhotoConsistency();
}

export { migratePhotoConsistency };