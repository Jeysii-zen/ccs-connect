import { useEffect, useRef } from 'react';

// Open modals, innermost last. Escape goes to the top one only, so a
// confirmation opened over a form closes without also closing the form.
const layers = [];
let savedOverflow = '';

function lockScroll() {
    if (layers.length === 1) {
        savedOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
}

function unlockScroll() {
    if (layers.length === 0) {
        document.body.style.overflow = savedOverflow;
    }
}

/**
 * Registers an open modal: locks page scrolling and routes Escape to
 * `onEscape` while this modal is the top-most one.
 *
 * @param {boolean} active whether the modal is open
 * @param {() => void} onEscape
 */
export function useModalLayer(active, onEscape) {
    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;

    useEffect(() => {
        if (!active) return undefined;

        const layer = {};
        layers.push(layer);
        lockScroll();

        const onKeyDown = (event) => {
            if (event.key === 'Escape' && layers[layers.length - 1] === layer) {
                event.stopPropagation();
                onEscapeRef.current?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            layers.splice(layers.indexOf(layer), 1);
            unlockScroll();
        };
    }, [active]);
}
