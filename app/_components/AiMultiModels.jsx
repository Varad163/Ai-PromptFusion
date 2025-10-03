"use client";

import React, { useState } from "react";
import AiModelList from "@/shared/AiModelList";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AiMultiModels() {
  const [aiModelList, setAiModelList] = useState(AiModelList);

  const handleSubModelChange = (modelName, subModel) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === modelName ? { ...m, selectedSubModel: subModel } : m
      )
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 border-b h-[75vh]">
      {aiModelList.map((model, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2 border rounded-md"
        >
          {/* Model info */}
          <div className="flex items-center gap-2">
            <Image src={model.icon} alt={model.model} width={24} height={24} />
            <span className="text-sm font-medium">{model.model}</span>
          </div>

          {/* Dropdown */}
          <Select
            value={model.selectedSubModel || ""}
            onValueChange={(value) =>
              handleSubModelChange(model.model, value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select submodel" />
            </SelectTrigger>
            <SelectContent>
  {model.subModel.map((sub, idx) => (
    <SelectItem key={sub.id} value={sub.name}>
      {sub.name} {sub.premium && "⭐"}
    </SelectItem>
  ))}
</SelectContent>

          </Select>
        </div>
      ))}
    </div>
  );
}
