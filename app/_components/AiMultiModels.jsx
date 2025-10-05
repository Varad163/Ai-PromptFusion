"use client";

import React, { useContext, useState, useEffect } from "react";
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
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import { SelectGroup } from "@radix-ui/react-select";

// 🧠 Firestore imports
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";

// ✅ Clerk import to get logged-in user
import { useUser } from "@clerk/nextjs";

export default function AiMultiModels() {
  const { user } = useUser(); // ✅ Get user from Clerk
  const userId = user?.id; // 👤 Get userId safely

  const isUserPremium = false;

  const [aiModelList, setAiModelList] = useState(
    AiModelList.map((m) => ({
      ...m,
      enabled: false,
      selectedSubModel: "",
    }))
  );

  const { aiSelectedModels, setAiSelectedModels } = useContext(
    AiSelectetdModelContext
  );

  // ✅ Save model selection to Firestore
  const saveSelectionToDB = async (model, subModel) => {
    if (!userId) return console.warn("⚠️ User not signed in");
    try {
      await setDoc(
        doc(db, "users", userId),
        {
          selectedModels: {
            [model]: subModel,
          },
        },
        { merge: true }
      );
      console.log("✅ Saved:", model, subModel);
    } catch (err) {
      console.error("❌ Error saving selection:", err);
    }
  };

  // ✅ Load saved selections from Firestore
  useEffect(() => {
    const fetchUserSelection = async () => {
      if (!userId) return; // wait until user is signed in
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.selectedModels) {
            console.log("📥 Loaded user selections:", data.selectedModels);
            setAiModelList((prev) =>
              prev.map((m) => ({
                ...m,
                selectedSubModel: data.selectedModels[m.model] || "",
                enabled: !!data.selectedModels[m.model],
              }))
            );
          }
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
      }
    };

    fetchUserSelection();
  }, [userId]); // 🔁 Refetch when userId changes (login/logout)

  // ✅ Toggle model on/off
  const handleToggle = (model) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  // ✅ Change selected submodel
  const handleSubModelChange = (model, subModel) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, selectedSubModel: subModel } : m
      )
    );
    saveSelectionToDB(model, subModel); // 🔁 Save to Firestore
  };

  const getSelectedSubModel = (model) =>
    model.subModel.find((sub) => sub.name === model.selectedSubModel);

  return (
    <div className="p-4 h-[calc(100vh-120px)] overflow-x-auto bg-gray-50">
      {!userId && (
        <p className="text-center text-sm text-gray-500 mb-4">
          ⚠️ Please sign in to save your model selections.
        </p>
      )}
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
                      <SelectTrigger className="w-[200px] h-8 text-sm">
                        <SelectValue
                          placeholder={
                            model.selectedSubModel || "Select submodel"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                            Free
                          </div>
                          {model.subModel
                            .filter((sub) => !sub.premium)
                            .map((sub) => (
                              <SelectItem key={sub.id} value={sub.name}>
                                {sub.name}
                              </SelectItem>
                            ))}

                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2 border-t border-gray-200">
                            Premium
                          </div>
                          {model.subModel
                            .filter((sub) => sub.premium)
                            .map((sub) => (
                              <SelectItem
                                key={sub.id}
                                value={sub.name}
                                disabled={!isUserPremium}
                              >
                                {sub.name} 💎
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {model.enabled && (
                    <span
                      className={`text-xs font-medium ${
                        isPremium ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {isPremium ? "Premium 💎" : "Free 🟢"}
                    </span>
                  )}
                  <Switch
                    checked={model.enabled}
                    onCheckedChange={() => handleToggle(model.model)}
                  />
                </div>
              </div>

              {model.enabled && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex flex-col items-center justify-center flex-1 p-4">
                    {!model.selectedSubModel && (
                      <p className="text-sm text-gray-400 italic">
                        Select a submodel to start...
                      </p>
                    )}
                    {model.selectedSubModel && isPremium && !isUserPremium && (
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
                    {model.selectedSubModel &&
                      (!isPremium || isUserPremium) && (
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
