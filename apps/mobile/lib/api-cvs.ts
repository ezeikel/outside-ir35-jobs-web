import { api } from "@/lib/api";
import type { PickedFile } from "@/lib/api-documents";

// Named, multi-version CVs. A contractor keeps several CVs tailored to different
// role-types; exactly one is active (drives job matching). Mirrors the web CV
// actions via /api/mobile/cvs.

export type CV = {
  id: string;
  name: string;
  status: string; // DocStatus
  isActive: boolean;
  parsed: boolean; // true once the worker has parsed it
  createdAt: string;
};

export const fetchCVs = async (): Promise<CV[]> => {
  const { data } = await api.get<{ cvs: CV[] }>("/api/mobile/cvs");
  return data.cvs;
};

export const uploadCV = async (
  name: string,
  file: PickedFile,
): Promise<CV> => {
  const form = new FormData();
  form.append("name", name);
  // RN multipart file part (see api-documents for the cast rationale).
  const filePart = {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob;
  form.append("file", filePart);

  const { data } = await api.post<{ cv: CV }>("/api/mobile/cvs", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.cv;
};

export const renameCV = async (id: string, name: string): Promise<void> => {
  await api.patch(`/api/mobile/cvs/${id}`, { name });
};

export const setActiveCV = async (id: string): Promise<void> => {
  await api.patch(`/api/mobile/cvs/${id}`, { isActive: true });
};

export const deleteCV = async (id: string): Promise<void> => {
  await api.delete(`/api/mobile/cvs/${id}`);
};
