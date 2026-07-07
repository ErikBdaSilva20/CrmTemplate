import { createCollectionHook } from "./data-cache";
import { listCompanies, type Company } from "@/lib/data";

const companiesStore = createCollectionHook<Company>(listCompanies);

export const useCompanies = companiesStore.useCollection;
export const invalidateCompanies = companiesStore.invalidate;
