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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function AiMultiModels() {
  const [aiModelList, setAiModelList] = useState(
    AiModelList.map((m) => ({
      ...m,
      enabled: false,
      selectedSubModel: "",
    }))
  );

  const handleToggle = (model) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  const handleSubModelChange = (model, subModel) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, selectedSubModel: subModel } : m
      )
    );
  };

  const getSelectedSubModel = (model) =>
    model.subModel.find((sub) => sub.name === model.selectedSubModel);

  return (
    <div className="p-4 h-[calc(100vh-120px)] overflow-x-auto bg-gray-50">
      <div className="flex gap-3 min-w-max h-full">
        {aiModelList.map((model, i) => {
          const selectedSub = getSelectedSubModel(model);
          const isPremium = selectedSub?.premium;

          return (
            <div
              key={i}
              className={`flex flex-col transition-all duration-300 border border-gray-200 rounded-xl bg-white shadow-sm ${
                model.enabled ? "w-[360px]" : "w-[80px]"
              } h-full overflow-hidden`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Image
                    src={model.icon}
                    alt={model.model}
                    width={26}
                    height={26}
                    className="rounded-full"
                  />
                  {model.enabled && (
                    <Select
                      value={model.selectedSubModel || ""}
                      onValueChange={(value) =>
                        handleSubModelChange(model.model, value)
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-sm">
                        <SelectValue placeholder={model.model} />
                      </SelectTrigger>
                      <SelectContent>
                        {model.subModel.map((sub) => (
                          <SelectItem key={sub.id} value={sub.name}>
                            {sub.name} {sub.premium && "💎"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Switch
                  checked={model.enabled}
                  onCheckedChange={() => handleToggle(model.model)}
                />
              </div>

              {/* Body */}
              {model.enabled && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex flex-col items-center justify-center flex-1 p-4">
                    {/* Case 1: No submodel */}
                    {!model.selectedSubModel && (
                      <p className="text-sm text-gray-400 italic">
                        Select a submodel to start...
                      </p>
                    )}

                    {/* Case 2: Premium */}
                    {model.selectedSubModel && isPremium && (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-sm text-gray-500 mb-3 text-center">
                          🔒 {model.selectedSubModel} is a Premium feature
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                        >
                          Upgrade to Unlock 💎
                        </Button>
                      </div>
                    )}

                    {/* Case 3: Normal */}
                    {model.selectedSubModel && !isPremium && (
                      <div className="w-full h-full flex flex-col">
                        <div className="text-xs text-gray-600 border border-blue-100 bg-blue-50 px-2 py-1 rounded-md mb-3 text-center">
                          Using:{" "}
                          <span className="font-medium text-blue-600">
                            {model.selectedSubModel}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                          💬 Chat area
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom line */}
                  <div className="border-t border-gray-200 p-2 text-center text-xs text-gray-400">
                    End of Chat
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
