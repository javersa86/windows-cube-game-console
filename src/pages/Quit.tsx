import { useEffect } from "react";
import CubeLayout from "../components/CubeLayout";
import CancelButton from "../components/Buttons/CancelButton";
import CubeLayoutStyle from "../styles/CubeLayout.module.css";
import { on, off, BUTTONS } from '../utils/gamepad';
import { play } from "../utils/sound.js";
import { electron } from "../platform";

function Quit() {
    useEffect(() => {
        const handleA = () => {
            play("click");
            electron.quit();
        };

        on(BUTTONS.A, handleA);

        return () => {
            off(BUTTONS.A, handleA);
        };
    }, []);

    return (
        <CubeLayout width="640px" height="640px">
            <h1>Quit</h1>
            <div className={CubeLayoutStyle.bottomLeft}>
                <p>Press A to Quit</p>
                <p>Press B to Cancel</p>
            </div>
            <CancelButton dst="/" />
        </CubeLayout>
    )
}

export default Quit;
