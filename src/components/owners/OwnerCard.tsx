"use client";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Owner } from "@/types/database";

interface OwnerCardProps {
  owner: Owner;
  onDelete: (id: string) => void;
}

const LAYOUT_LABELS: Record<string, string> = {
  summary:  "Summary",
  standard: "Standard",
  detailed: "Detailed",
};

const PMS_LABELS: Record<string, string> = {
  appfolio: "AppFolio",
  buildium: "Buildium",
};

export function OwnerCard({ owner, onDelete }: OwnerCardProps) {
  return (
    <div className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-gray-50/80 transition-colors">
      <div className="col-span-4 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-indigo-600">
            {owner.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-[13.5px] font-semibold text-gray-900 truncate">{owner.name}</span>
      </div>

      <span className="col-span-4 text-[13px] text-gray-400 truncate">{owner.email}</span>

      <div className="col-span-2 flex items-center gap-1.5">
        <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
          {LAYOUT_LABELS[owner.layout] ?? owner.layout}
        </span>
        <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {PMS_LABELS[owner.pms_type] ?? owner.pms_type}
        </span>
      </div>

      <div className="col-span-2 flex justify-end items-center gap-1">
        <Link
          href={`/dashboard/owners/${owner.id}`}
          prefetch={true}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          onClick={() => {
            if (confirm(`Remove ${owner.name} from active owners?`)) {
              onDelete(owner.id);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
