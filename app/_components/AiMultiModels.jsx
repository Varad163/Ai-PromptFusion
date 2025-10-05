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
import { doc, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";

// ✅ Clerk import to get logged-in user
import { useUser } from "@clerk/nextjs";

export default function AiMultiModels() {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress; // 🔑 use email as document ID
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

  // ✅ Save selected model to Firestore
  const saveSelectionToDB = async (model, subModel) => {
    if (!userEmail) return console.warn("⚠️ User not signed in");
    try {
      await setDoc(
        doc(db, "users", userEmail),
        {
          selectedModelPref: {
            [model]: { modelId: subModel },
          },
        },
        { merge: true }
      );
      console.log(`✅ Saved: ${model} → ${subModel}`);
    } catch (err) {
      console.error("❌ Error saving selection:", err);
    }
  };

  // 🗑️ Remove model when disabled
  const removeSelectionFromDB = async (model) => {
    if (!userEmail) return;
    try {
      await updateDoc(doc(db, "users", userEmail), {
        [`selectedModelPref.${model}`]: deleteField(),
      });
      console.log(`🗑️ Removed ${model} from Firestore`);
    } catch (err) {
      console.error("❌ Error removing selection:", err);
    }
  };

  // ✅ Load saved selections from Firestore
  useEffect(() => {
    const fetchUserSelection = async () => {
      if (!userEmail) return;
      try {
        const snap = await getDoc(doc(db, "users", userEmail));
        if (snap.exists()) {
          const data = snap.data();
          if (data.selectedModelPref) {
            console.log("📥 Loaded user selections:", data.selectedModelPref);
            setAiModelList((prev) =>
              prev.map((m) => ({
                ...m,
                selectedSubModel: data.selectedModelPref[m.model]?.modelId || "",
                enabled: !!data.selectedModelPref[m.model],
              }))
            );
          }
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
      }
    };

    fetchUserSelection();
  }, [userEmail]);

  // ✅ Toggle model ON/OFF
  const handleToggle = async (model) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, enabled: !m.enabled } : m
      )
    );

    const selected = aiModelList.find((m) => m.model === model);
    const newStatus = !selected.enabled;

    // 🧠 Firestore sync
    if (!newStatus) {
      await removeSelectionFromDB(model);
    } else if (selected.selectedSubModel) {
      await saveSelectionToDB(model, selected.selectedSubModel);
    }
  };

  // ✅ Handle submodel change
  const handleSubModelChange = (model, subModel) => {
    setAiModelList((prev) =>
      prev.map((m) =>
        m.model === model ? { ...m, selectedSubModel: subModel } : m
      )
    );
    saveSelectionToDB(model, subModel);
  };

  const getSelectedSubModel = (model) =>
    model.subModel.find((sub) => sub.name === model.selectedSubModel);

  return (
    <div className="p-4 h-[calc(100vh-120px)] overflow-x-auto bg-gray-50">
      {!userEmail && (
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
