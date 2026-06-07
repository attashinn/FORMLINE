import { forwardRef, type ComponentType, type SVGProps } from "react";

import alignLeftSvg from "../../heroicons-master/optimized/24/outline/bars-3-bottom-left.svg?raw";
import arrowDownSvg from "../../heroicons-master/optimized/24/outline/arrow-down.svg?raw";
import arrowDownTraySvg from "../../heroicons-master/optimized/24/outline/arrow-down-tray.svg?raw";
import arrowLeftSvg from "../../heroicons-master/optimized/24/outline/arrow-left.svg?raw";
import arrowLeftStartOnRectangleSvg from "../../heroicons-master/optimized/24/outline/arrow-left-start-on-rectangle.svg?raw";
import arrowPathSvg from "../../heroicons-master/optimized/24/outline/arrow-path.svg?raw";
import arrowRightSvg from "../../heroicons-master/optimized/24/outline/arrow-right.svg?raw";
import arrowUpSvg from "../../heroicons-master/optimized/24/outline/arrow-up.svg?raw";
import arrowUpRightSvg from "../../heroicons-master/optimized/24/outline/arrow-up-right.svg?raw";
import bars2Svg from "../../heroicons-master/optimized/24/outline/bars-2.svg?raw";
import bars3Svg from "../../heroicons-master/optimized/24/outline/bars-3.svg?raw";
import boltSvg from "../../heroicons-master/optimized/24/outline/bolt.svg?raw";
import calendarSvg from "../../heroicons-master/optimized/24/outline/calendar.svg?raw";
import chartBarSvg from "../../heroicons-master/optimized/24/outline/chart-bar.svg?raw";
import checkCircleSvg from "../../heroicons-master/optimized/24/outline/check-circle.svg?raw";
import checkSvg from "../../heroicons-master/optimized/24/outline/check.svg?raw";
import chevronDownSvg from "../../heroicons-master/optimized/24/outline/chevron-down.svg?raw";
import chevronLeftSvg from "../../heroicons-master/optimized/24/outline/chevron-left.svg?raw";
import chevronRightSvg from "../../heroicons-master/optimized/24/outline/chevron-right.svg?raw";
import chevronUpSvg from "../../heroicons-master/optimized/24/outline/chevron-up.svg?raw";
import clipboardDocumentCheckSvg from "../../heroicons-master/optimized/24/outline/clipboard-document-check.svg?raw";
import clipboardDocumentListSvg from "../../heroicons-master/optimized/24/outline/clipboard-document-list.svg?raw";
import documentDuplicateSvg from "../../heroicons-master/optimized/24/outline/document-duplicate.svg?raw";
import documentTextSvg from "../../heroicons-master/optimized/24/outline/document-text.svg?raw";
import ellipsisHorizontalSvg from "../../heroicons-master/optimized/24/outline/ellipsis-horizontal.svg?raw";
import envelopeSvg from "../../heroicons-master/optimized/24/outline/envelope.svg?raw";
import folderOpenSvg from "../../heroicons-master/optimized/24/outline/folder-open.svg?raw";
import hashtagSvg from "../../heroicons-master/optimized/24/outline/hashtag.svg?raw";
import inboxSvg from "../../heroicons-master/optimized/24/outline/inbox.svg?raw";
import linkSvg from "../../heroicons-master/optimized/24/outline/link.svg?raw";
import listBulletSvg from "../../heroicons-master/optimized/24/outline/list-bullet.svg?raw";
import magnifyingGlassSvg from "../../heroicons-master/optimized/24/outline/magnifying-glass.svg?raw";
import minusSvg from "../../heroicons-master/optimized/24/outline/minus.svg?raw";
import numberedListSvg from "../../heroicons-master/optimized/24/outline/numbered-list.svg?raw";
import paperAirplaneSvg from "../../heroicons-master/optimized/24/outline/paper-airplane.svg?raw";
import paperClipSvg from "../../heroicons-master/optimized/24/outline/paper-clip.svg?raw";
import phoneSvg from "../../heroicons-master/optimized/24/outline/phone.svg?raw";
import plusSvg from "../../heroicons-master/optimized/24/outline/plus.svg?raw";
import rectangleGroupSvg from "../../heroicons-master/optimized/24/outline/rectangle-group.svg?raw";
import shieldCheckSvg from "../../heroicons-master/optimized/24/outline/shield-check.svg?raw";
import sparklesSvg from "../../heroicons-master/optimized/24/outline/sparkles.svg?raw";
import squares2x2Svg from "../../heroicons-master/optimized/24/outline/squares-2x2.svg?raw";
import swatchSvg from "../../heroicons-master/optimized/24/outline/swatch.svg?raw";
import trashSvg from "../../heroicons-master/optimized/24/outline/trash.svg?raw";
import usersSvg from "../../heroicons-master/optimized/24/outline/users.svg?raw";
import xMarkSvg from "../../heroicons-master/optimized/24/outline/x-mark.svg?raw";

export type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;
export type LucideIcon = HeroIcon;

const svgBody = (source: string) =>
  source.replace(/^<svg[^>]*>\s*/, "").replace(/\s*<\/svg>\s*$/, "");

const createIcon = (displayName: string, source: string): HeroIcon => {
  const Icon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      data-slot="icon"
      dangerouslySetInnerHTML={{ __html: svgBody(source) }}
      {...props}
    />
  ));

  Icon.displayName = displayName;
  return Icon;
};

export const AlignLeft = createIcon("AlignLeft", alignLeftSvg);
export const ArrowDown = createIcon("ArrowDown", arrowDownSvg);
export const ArrowLeft = createIcon("ArrowLeft", arrowLeftSvg);
export const ArrowRight = createIcon("ArrowRight", arrowRightSvg);
export const ArrowUp = createIcon("ArrowUp", arrowUpSvg);
export const ArrowUpRight = createIcon("ArrowUpRight", arrowUpRightSvg);
export const BarChart3 = createIcon("BarChart3", chartBarSvg);
export const Calendar = createIcon("Calendar", calendarSvg);
export const Check = createIcon("Check", checkSvg);
export const ChevronDown = createIcon("ChevronDown", chevronDownSvg);
export const ChevronLeft = createIcon("ChevronLeft", chevronLeftSvg);
export const ChevronRight = createIcon("ChevronRight", chevronRightSvg);
export const ChevronUp = createIcon("ChevronUp", chevronUpSvg);
export const ClipboardList = createIcon("ClipboardList", clipboardDocumentListSvg);
export const Copy = createIcon("Copy", documentDuplicateSvg);
export const Download = createIcon("Download", arrowDownTraySvg);
export const FileText = createIcon("FileText", documentTextSvg);
export const FolderOpen = createIcon("FolderOpen", folderOpenSvg);
export const GripVertical = createIcon("GripVertical", bars2Svg);
export const Hash = createIcon("Hash", hashtagSvg);
export const Inbox = createIcon("Inbox", inboxSvg);
export const LayoutGrid = createIcon("LayoutGrid", squares2x2Svg);
export const LayoutTemplate = createIcon("LayoutTemplate", rectangleGroupSvg);
export const Link2 = createIcon("Link2", linkSvg);
export const ListChecks = createIcon("ListChecks", clipboardDocumentCheckSvg);
export const Loader2 = createIcon("Loader2", arrowPathSvg);
export const LogOut = createIcon("LogOut", arrowLeftStartOnRectangleSvg);
export const Mail = createIcon("Mail", envelopeSvg);
export const Minus = createIcon("Minus", minusSvg);
export const MoreHorizontal = createIcon("MoreHorizontal", ellipsisHorizontalSvg);
export const Palette = createIcon("Palette", swatchSvg);
export const PanelLeft = createIcon("PanelLeft", rectangleGroupSvg);
export const Paperclip = createIcon("Paperclip", paperClipSvg);
export const Phone = createIcon("Phone", phoneSvg);
export const Plus = createIcon("Plus", plusSvg);
export const Rows3 = createIcon("Rows3", numberedListSvg);
export const Save = createIcon("Save", documentTextSvg);
export const Search = createIcon("Search", magnifyingGlassSvg);
export const Send = createIcon("Send", paperAirplaneSvg);
export const Shield = createIcon("Shield", shieldCheckSvg);
export const Sparkles = createIcon("Sparkles", sparklesSvg);
export const TextCursorInput = createIcon("TextCursorInput", bars3Svg);
export const ToggleLeft = createIcon("ToggleLeft", checkCircleSvg);
export const Trash2 = createIcon("Trash2", trashSvg);
export const Users = createIcon("Users", usersSvg);
export const X = createIcon("X", xMarkSvg);
export const Zap = createIcon("Zap", boltSvg);

export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;

export const Circle = createIcon(
  "Circle",
  '<circle cx="12" cy="12" r="7.5" stroke-linecap="round" stroke-linejoin="round"/>',
);
