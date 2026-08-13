export interface TemplateCatalogSettingsState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

export const initialTemplateCatalogSettingsState: TemplateCatalogSettingsState = {
  status: "idle",
  message: "",
};
