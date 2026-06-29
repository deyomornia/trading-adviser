import type { Asset } from "@/types";
import type { DataProvider } from "./provider";
import { sampleAssets } from "@/data/sampleAssets";

export const mockProvider: DataProvider = {
  name: "mock-sample",
  async getAssets(): Promise<Asset[]> {
    return sampleAssets;
  },
};
