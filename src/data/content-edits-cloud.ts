import { deleteDoc, doc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import { firebaseClient } from "../lib/firebase";
import { editId, readEdit, type EditKind } from "./content-edits";

export interface EditInput {
  kind: EditKind;
  bookId: string;
  target: string;
  data: unknown;
  hidden: boolean;
  lessonId?: number;
}

// Admin write path: the same validation as learners' reader runs first, then Firestore rules check the claim.
export async function saveContentEdit(input: EditInput, uid: string, db: Firestore = firebaseClient().db) {
  if (!readEdit({ ...input, updatedAt: 0 })) throw new Error("Nội dung sửa chưa hợp lệ. Hãy kiểm tra các ô bắt buộc.");
  await setDoc(doc(db, "contentEdits", editId(input.kind, input.bookId, input.target)), {
    version: 1,
    kind: input.kind,
    bookId: input.bookId,
    target: input.target,
    data: input.data == null ? "" : JSON.stringify(input.data),
    hidden: input.hidden,
    ...(input.kind === "exercise" ? { lessonId: input.lessonId } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

// Removing an edit restores the bundled original.
export async function removeContentEdit(id: string, db: Firestore = firebaseClient().db) {
  await deleteDoc(doc(db, "contentEdits", id));
}
