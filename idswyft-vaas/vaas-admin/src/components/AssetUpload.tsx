import React, { useRef, useState } from 'react';

interface AssetUploadProps {
  label: string;
  currentUrl: string | null | undefined;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function AssetUpload({ label, currentUrl, onUpload, disabled }: AssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG, JPG, and WebP files are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2MB');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      {/* Preview */}
      <div className="w-full h-24 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-gray-400 text-sm">No image set</span>
        )}
      </div>

      {/* Label + upload button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Format hint */}
      <p className="text-xs text-gray-400">PNG, JPG, WebP · Max 2MB</p>

      {/* Error */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
