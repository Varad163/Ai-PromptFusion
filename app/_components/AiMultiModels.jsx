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
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import { SelectGroup } from "@radix-ui/react-select";
import { doc, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import { useUser } from "@clerk/nextjs";

export default function AiMultiModels() {
  const { aiSelectedModels, setAiSelectedModels, messages, setMessages } =
    useContext(AiSelectetdModelContext);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isUserPremium = false;

  const [aiModelList, setAiModelList] = useState(
    AiModelList.map((m) => ({
      ...m,
      enabled: false,
      selectedSubModel: "",
    }))
  );

  // Helper: dedupe per-model messages (keep as you had)
  const getUniqueMessages = (modelName) => {
    const modelMessages = messages?.[modelName] || [];
    const unique = Array.from(
      new Map(modelMessages.map((msg) => [msg.role + "||" + msg.content, msg])).values()
    );
    return unique;
  };

  const getSelectedSubModel = (model) =>
    model.subModel.find((sub) => sub.name === model.selectedSubModel);

  const saveSelectionToDB = async (model, subModel) => {
    if (!userEmail) return;
    try {
      await setDoc(
        doc(db, "users", userEmail),
        { selectedModelPref: { [model]: { modelId: subModel } } },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
    }
  };
  const removeSelectionFromDB = async (model) => {
    if (!userEmail) return;
    try {
      await updateDoc(doc(db, "users", userEmail), {
        [`selectedModelPref.${model}`]: deleteField(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchUserSelection = async () => {
      if (!userEmail) return;
      try {
        const snap = await getDoc(doc(db, "users", userEmail));
        if (snap.exists()) {
          const data = snap.data();
          if (data.selectedModelPref) {
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
        console.error(err);
      }
    };
    fetchUserSelection();
  }, [userEmail]);

  const handleToggle = async (model) => {
    setAiModelList((prev) => prev.map((m) => (m.model === model ? { ...m, enabled: !m.enabled } : m)));
    const selected = aiModelList.find((m) => m.model === model);
    const newStatus = !selected?.enabled;
    if (!newStatus) await removeSelectionFromDB(model);
    else if (selected?.selectedSubModel) await saveSelectionToDB(model, selected.selectedSubModel);
  };

  const handleSubModelChange = (model, subModel) => {
    setAiModelList((prev) => prev.map((m) => (m.model === model ? { ...m, selectedSubModel: subModel } : m)));
    saveSelectionToDB(model, subModel);
  };

  return (
    // OUTER: fixed viewport area for model columns
    <div className="p-4 h-[calc(100vh-120px)] overflow-x-auto bg-gray-50">
      {!userEmail && (
        <p className="text-center text-sm text-gray-500 mb-4">⚠️ Please sign in to save your model selections.</p>
      )}

      {/* HORIZONTAL container for columns */}
      <div className="flex gap-3 min-w-max h-full">
        {aiModelList.map((model, i) => {
          const selectedSub = getSelectedSubModel(model);
          const isPremium = selectedSub?.premium;
          const modelMessages = getUniqueMessages(model.model);

          return (
            <div
              key={i}
              // Column: fill full height of outer container
              className={`flex flex-col transition-all duration-300 border border-gray-200 rounded-xl bg-white shadow-sm ${
                model.enabled ? "w-[360px]" : "w-[80px]"
              } h-full`}
            >
              {/* Header (fixed height) */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-none">
                <div className="flex items-center gap-2">
                  <Image src={model.icon} alt={model.model} width={26} height={26} className="rounded-full" />
                  {model.enabled && (
                    <Select value={model.selectedSubModel || ""} onValueChange={(value) => handleSubModelChange(model.model, value)}>
                      <SelectTrigger className="w-[200px] h-8 text-sm">
                        <SelectValue placeholder={model.selectedSubModel || "Select submodel"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500">Free</div>
                          {model.subModel
                            .filter((sub) => !sub.premium)
                            .map((sub) => (
                              <SelectItem key={sub.id} value={sub.name}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2 border-t border-gray-200">Premium</div>
                          {model.subModel
                            .filter((sub) => sub.premium)
                            .map((sub) => (
                              <SelectItem key={sub.id} value={sub.name} disabled={!isUserPremium}>
                                {sub.name} 💎
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {model.enabled && <span className={`text-xs font-medium ${isPremium ? "text-yellow-600" : "text-green-600"}`}>{isPremium ? "Premium 💎" : "Free 🟢"}</span>}
                  <Switch
  checked={model.enabled}
  onCheckedChange={() => handleToggle(model.model)} // ✅ runs only on toggle
/>

                </div>
              </div>

              {/* MESSAGES: flex-1 + overflow-y-auto + explicit maxHeight to guarantee scroll */}
              {model.enabled && (
                <div className="flex flex-col flex-1">
                  {/* Use both flex-1 and a MAX HEIGHT - this combination is robust */}
                  <div
                    className="flex-1 p-4 space-y-2 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300"
                    // explicit maxHeight ensures the browser limits the box height even if some ancestor resets sizing
                    style={{ maxHeight: "calc(100vh - 220px)" }}
                  >
                    {modelMessages.length > 0 ? (
                      modelMessages.map((m, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-md w-full text-sm ${m.role === "user" ? "bg-blue-100 text-blue-900 self-end" : "bg-gray-100 text-gray-900 self-start"}`}
                        >
                          {m.role === "assistant" && (
                            <span className="block text-xs text-gray-500 mb-1">{m.model ?? model.model}</span>
                          )}
                          {m.content}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">Select a submodel to start...</p>
                    )}
                  </div>

                  {/* footer (fixed) */}
                  <div className="border-t border-gray-200 p-2 text-center text-xs text-gray-400 flex-none">End of Chat</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
