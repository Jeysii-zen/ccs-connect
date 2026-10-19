import LoadingImage from '@/components/ui/LoadingImage';
import { ImagePlus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Drag-and-drop image picker. The whole box is the target: drop a file on
 * it, or click it (Enter/Space from the keyboard) to choose one. With a
 * `preview` it shows the image (with a loading state) and accepts a new
 * file to replace it.
 *
 * The parent validates files in `onFiles(files)`; `accept` only filters
 * the file dialog, since a dropped file can be anything.
 */
export default function ImageDropzone({
    id,
    accept = ['image/jpeg', 'image/png', 'image/webp'],
    multiple = false,
    disabled = false,
    preview = null,
    previewAlt = 'Selected image',
    title = 'Drag and drop a photo here',
    hint,
    invalid = false,
    describedBy,
    onFiles,
    className = '',
    previewClassName = 'h-56 sm:h-64',
}) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const choose = () => {
        if (!disabled) inputRef.current?.click();
    };

    const take = (fileList) => {
        const files = Array.from(fileList ?? []);

        if (!disabled && files.length > 0) {
            onFiles(multiple ? files : files.slice(0, 1));
        }
    };

    const dragProps = {
        onDragEnter: (event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
        },
        onDragOver: (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        },
        onDragLeave: (event) => {
            // Ignore moves between children inside the box.
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        },
        onDrop: (event) => {
            event.preventDefault();
            setDragging(false);
            take(event.dataTransfer.files);
        },
    };

    return (
        <div className={className}>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept.join(',')}
                multiple={multiple}
                disabled={disabled}
                className="sr-only"
                tabIndex={-1}
                aria-describedby={describedBy}
                onChange={(event) => {
                    take(event.target.files);
                    // Allow choosing the same file again later.
                    event.target.value = '';
                }}
            />

            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled || undefined}
                aria-label={preview ? `${title}. Current image selected; choose or drop a new one to replace it.` : title}
                aria-describedby={describedBy}
                onClick={choose}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        choose();
                    }
                }}
                {...dragProps}
                className={`group relative overflow-hidden rounded-3xl border-2 border-dashed outline-none transition duration-200 focus-visible:ring-4 focus-visible:ring-blue-100 ${
                    dragging
                        ? 'scale-[1.01] border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                        : invalid
                          ? 'border-red-300 bg-red-50/40 hover:border-red-400'
                          : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40'
                } ${disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
            >
                {preview ? (
                    <>
                        <LoadingImage src={preview} alt={previewAlt} className={`w-full ${previewClassName}`} />

                        {/* Replace hint; covers the image while dragging. */}
                        <div
                            className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-[#020618]/70 to-transparent px-4 pb-3 pt-8 text-xs font-semibold text-white transition ${
                                dragging ? 'opacity-0' : 'opacity-100'
                            }`}
                        >
                            <Upload size={14} />
                            Click or drop a new image to replace
                        </div>
                        {dragging && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-blue-600/70 text-white backdrop-blur-sm">
                                <ImagePlus size={28} />
                                <span className="text-sm font-semibold">Drop to replace</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center px-5 py-9 text-center sm:py-10">
                        <span
                            className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition duration-200 ${
                                dragging
                                    ? 'scale-110 bg-blue-600 text-white'
                                    : 'bg-white text-blue-600 group-hover:scale-105'
                            }`}
                        >
                            <ImagePlus size={24} />
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                            {dragging ? 'Drop it here' : title}
                        </span>
                        <span className="mt-1 text-xs text-slate-500">
                            or <span className="font-semibold text-blue-700 underline-offset-2 group-hover:underline">click to choose</span> from your device
                        </span>
                        {hint && <span className="mt-3 text-[11px] text-slate-400">{hint}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
