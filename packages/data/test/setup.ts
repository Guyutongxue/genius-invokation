import { beforeAll } from "bun:test";
import data from "../src/index";
import { extendTestData } from "@gi-tcg/core/mock";


beforeAll(() => {
  extendTestData(data);
})
