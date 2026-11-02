// Public Firebase settings, shared by the SDK client and the SDK-free REST reader of content edits.
export const firebaseEmulated = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCwcc6NYcrLS8CbnSvIJZ2AX4W50D8uENo",
  authDomain: "vocab-web-next.firebaseapp.com",
  projectId: firebaseEmulated ? "demo-vocab-sync" : "vocab-web-next",
  appId: "1:670784686937:web:533efebb0ae99a195d9a48",
};
