import { test } from "bun:test";
import { GameTester } from "@gi-tcg/core/mock";
import { Barbara } from "../src/characters/hydro/barbara";

test("trivial", () => {
  const tester = new GameTester();

  tester.setState({
    myActive: Barbara
  })

  tester.start();

  // console.log(tester.query("my active"));
})
