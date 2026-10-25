"use client";
import { createContext, useContext } from "react";
import type { Word } from "../domain/types";

export const WordContext = createContext<(word: Word) => void>(() => {});
export const useWord = () => useContext(WordContext);
