export interface TemplateImportState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

export const initialTemplateImportState: TemplateImportState = {
  status: "idle",
  message: "",
};
