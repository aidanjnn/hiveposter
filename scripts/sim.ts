/**
 * Plan §11. Headless Watch-mode simulator.
 *
 *   pnpm sim --games 10 --civ anthropic/claude-haiku-4.5 --imp anthropic/claude-sonnet-5.5
 *
 * Prints, per config: imposter win rate | caught-but-guessed | clue rejections | avg turn latency | cost/game
 * and per persona: vote accuracy. The output table goes in the README write-up.
 *
 * Runs the pure engine + agents directly (no HTTP). Needs AI_GATEWAY_API_KEY in the environment.
 */
import "dotenv/config";

async function main() {
  const args = process.argv.slice(2);
  console.log("TODO(sim): run games", args);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
