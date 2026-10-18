import exercisesJson from "@/data/exercises.json";
import type { Exercises } from "./types";

export const EXERCISES = exercisesJson as unknown as Exercises;
