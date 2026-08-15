import { useState, useEffect, useRef } from "react";
import CancelButton from "../components/Buttons/CancelButton";
import CubeLayout from "../components/CubeLayout";
import GameSelectionsView from "../components/GamesPageComponents/GameSelectionsView";
import GameSnippet from "../components/GamesPageComponents/GameSnippet";
import CubeLayoutStyle from "../styles/CubeLayout.module.css";
import { getGamePreview, getGameTitleFile, availableGameCovers } from "../../electron/utils/assets.js";
import { on, off, BUTTONS } from '../../electron/utils/gamepad';

function Games() {
    const [gameSrc, setGameSrc] = useState("");
    const [gameTitle, setGameTitle] = useState("");
    const [, setGameId] = useState("");
    const gameIdRef = useRef("");

    const loadGames = async (retries = 5, delay = 2000) => {
        const files = await availableGameCovers();

        if (files.length === 0) {
            if (retries > 0) {
                setGameTitle("Looking for games...");
                setTimeout(() => loadGames(retries - 1, delay), delay);
            } else {
                setGameTitle("No Games Found");
            }
            return;
        }

        getGamePreview(files[0]).then(setGameSrc);

        getGameTitleFile(files[0]).then((titleFile: string) => {
            window.electron.readGameTitle(titleFile).then((data: string | null) => {
                setGameTitle(data || "Unknown Game");
            });
        });

        setGameId(files[0]);
        gameIdRef.current = files[0];
    };

    useEffect(() => {
        loadGames();

        const handleAButton = () => {
            if (!gameIdRef.current) return;
            window.games.launch(gameIdRef.current);
        };

        on(BUTTONS.A, handleAButton);

        return () => {
            off(BUTTONS.A, handleAButton);
        };
    }, []);

    return (
        <CubeLayout width="800px" height="800px">
            <GameSelectionsView nextGame={gameTitle} currentGame={gameTitle} prevGame={gameTitle}/>

            {gameSrc && <GameSnippet src={gameSrc} />}

            <CancelButton dst="/" />

            <div className={CubeLayoutStyle.bottomLeft}>
                <p>Press Up/Down to Switch Games</p>
                <p>Press A to Select Game</p>
                <p>Press B to Return to Main Menu</p>
            </div>
        </CubeLayout>
    )
}

export default Games