import { useLayoutEffect, type RefObject } from "react";

// Publishes an element's height as a CSS custom property on :root.
//
// The header is `sticky top-0` and the feed tabs have to sit directly under
// it. A hardcoded offset would be wrong the moment anything changes height,
// and two things change it routinely here: the header wraps at narrow widths,
// and the larger-text preference and browser zoom both grow it. Measuring is
// the only version that survives those.
//
// useLayoutEffect rather than useEffect, so the variable is set before the
// browser paints and the tabs never flash at the wrong offset.
export function useStickyVar(ref: RefObject<HTMLElement | null>, name: string) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const write = () => {
      document.documentElement.style.setProperty(
        name,
        `${Math.round(node.getBoundingClientRect().height)}px`,
      );
    };

    write();
    const observer = new ResizeObserver(write);
    observer.observe(node);
    return () => {
      observer.disconnect();
      // Leaving a stale height behind would offset a view that no longer has
      // this element. The feed tabs unmount on every other view.
      document.documentElement.style.removeProperty(name);
    };
  }, [ref, name]);
}
