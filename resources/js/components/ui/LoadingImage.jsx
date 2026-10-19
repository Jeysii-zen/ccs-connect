import { ImageOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function Frame({ src, alt, className, imgClassName, label, loading }) {
    const imgRef = useRef(null);
    const [state, setState] = useState('loading');

    // A cached image can finish before React attaches onLoad.
    useEffect(() => {
        const img = imgRef.current;

        if (img?.complete) {
            setState(img.naturalWidth > 0 ? 'loaded' : 'error');
        }
    }, []);

    return (
        <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                loading={loading}
                decoding="async"
                onLoad={() => setState('loaded')}
                onError={() => setState('error')}
                className={`h-full w-full transition-opacity duration-300 ${
                    state === 'loaded' ? 'opacity-100' : 'opacity-0'
                } ${imgClassName}`}
            />

            {state === 'loading' && (
                <div
                    role="status"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-50 via-slate-100 to-cyan-50"
                >
                    <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-white/40" />
                    <span className="relative h-7 w-7 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
                    <span className="relative text-xs font-semibold text-blue-700">{label}</span>
                </div>
            )}

            {state === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-100 px-3 text-center text-slate-500">
                    <ImageOff size={22} />
                    <span className="text-xs font-medium">Preview unavailable</span>
                </div>
            )}
        </div>
    );
}

/**
 * An image that shows a loading state (shimmer, spinner, "Loading photo…")
 * until it has decoded, then fades in. Large phone photos take a moment to
 * decode, so a freshly selected or dropped file is never a blank box.
 *
 * `className` sizes the frame; `imgClassName` sets object-fit etc.
 * Images load lazily (when scrolled near); pass loading="eager" for one
 * at the top of the page.
 */
export default function LoadingImage({
    src,
    alt = '',
    className = '',
    imgClassName = 'object-cover',
    label = 'Loading photo…',
    loading = 'lazy',
}) {
    // Keyed by src so a new file starts its own loading state.
    return (
        <Frame
            key={src}
            src={src}
            alt={alt}
            className={className}
            imgClassName={imgClassName}
            label={label}
            loading={loading}
        />
    );
}
