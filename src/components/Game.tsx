"use client";

import { useGame } from "./useGame";
import { Lobby } from "./Lobby";
import { RoleCard } from "./RoleCard";
import { Table } from "./Table";
import { Discussion } from "./Discussion";
import { VoteList } from "./VoteList";
import { LastGuess, Reveal } from "./Reveal";
import { WatchPanel } from "./WatchPanel";
import { Button } from "./ui/Button";

/** The whole game on one route, driven by view.phase (plan §09). */
export function Game() {
  const game = useGame();
  const { view } = game;

  if (!view) return <Lobby onStart={(mode, practice) => game.start(mode, { practice })} busy={game.busy} notice={game.notice ?? game.error} />;

  const side = view.mode === "watch" && view.phase !== "reveal" ? <WatchPanel game={game} view={view} /> : undefined;
  let screen: React.ReactNode;
  if (view.mode === "play" && !game.started) screen = <RoleCard view={view} onReady={game.begin} />;
  else if (view.phase === "clue1" || view.phase === "clue2") screen = <Table game={game} view={view} side={side} />;
  else if (view.phase === "discuss") screen = <Discussion game={game} view={view} side={side} />;
  else if (view.phase === "vote") screen = <VoteList game={game} view={view} side={side} />;
  else if (view.phase === "lastGuess") screen = <LastGuess game={game} view={view} />;
  else screen = <Reveal game={game} view={view} />;

  return (
    <>
      {screen}
      {game.error ? (
        <div role="alert" className="mx-auto mb-6 flex w-full max-w-[440px] items-center justify-between gap-3 px-5 text-[13px] text-ink-2">
          <span>{game.error}</span>
          <Button variant="ghost" onClick={game.retry}>
            Try again
          </Button>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[440px] px-5 pb-6">
        <Button variant="text" className="font-mono text-label" onClick={game.leave}>
          Leave table
        </Button>
      </div>
    </>
  );
}
