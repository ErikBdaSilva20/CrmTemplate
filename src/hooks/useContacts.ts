import { createCollectionHook } from "./data-cache";
import { listContacts, type Contact } from "@/lib/data";

const contactsStore = createCollectionHook<Contact>(listContacts);

export const useContacts = contactsStore.useCollection;
export const invalidateContacts = contactsStore.invalidate;
