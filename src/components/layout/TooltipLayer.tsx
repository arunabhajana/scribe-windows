import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TooltipState = {
    text: string;
    left: number;
    top: number;
    placement: "top" | "right";
};

export function TooltipLayer() {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    useEffect(() => {
        let timer = 0;
        const show = (target: Element) => {
            const text = target.getAttribute("data-tooltip");
            if (!text) return;
            const rect = target.getBoundingClientRect();
            const collapsedSidebar =
                target.closest(".app-layout.sidebar-collapsed .sidebar") !== null;
            const toolbar = target.closest(".format-toolbar") !== null;
            const composerFooter = target.closest(".composer-footer") !== null;
            const placement = collapsedSidebar ? "right" : "top";
            const left =
                placement === "right"
                    ? rect.right + 11
                    : Math.max(
                        14,
                        Math.min(window.innerWidth - 14, rect.left + rect.width / 2),
                    );
            const top =
                placement === "right"
                    ? Math.max(
                        48,
                        Math.min(window.innerHeight - 48, rect.top + rect.height / 2),
                    )
                    : Math.max(48, rect.top - (toolbar || composerFooter ? 12 : 10));
            setTooltip({
                text,
                left,
                top,
                placement: toolbar || composerFooter ? "top" : placement,
            });
        };
        const schedule = (event: Event) => {
            const target = (event.target as Element | null)?.closest(
                "[data-tooltip]",
            );
            if (!target) return;
            window.clearTimeout(timer);
            timer = window.setTimeout(() => show(target), 350);
        };
        const hide = () => {
            window.clearTimeout(timer);
            setTooltip(null);
        };
        const move = (event: Event) => {
            const target = (event.target as Element | null)?.closest(
                "[data-tooltip]",
            );
            if (!target) hide();
        };
        document.addEventListener("pointerover", schedule);
        document.addEventListener("pointerout", move);
        document.addEventListener("focusin", schedule);
        document.addEventListener("focusout", hide);
        window.addEventListener("scroll", hide, true);
        window.addEventListener("resize", hide);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener("pointerover", schedule);
            document.removeEventListener("pointerout", move);
            document.removeEventListener("focusin", schedule);
            document.removeEventListener("focusout", hide);
            window.removeEventListener("scroll", hide, true);
            window.removeEventListener("resize", hide);
        };
    }, []);

    if (!tooltip) return null;
    return createPortal(
        <div
            className={`app-tooltip app-tooltip-${tooltip.placement}`}
            style={{ left: tooltip.left, top: tooltip.top }}
        >
            {tooltip.text}
        </div>,
        document.body,
    );
}
