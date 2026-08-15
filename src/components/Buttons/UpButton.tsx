import { useState, useEffect } from "react";
import UpButtonStyle from "../../styles/UpButton.module.css"
import { preload, play } from "../../../electron/utils/sound.js";
import { getPicturePath } from "../../../electron/utils/assets.js";
import { on, off, BUTTONS } from '../../../electron/utils/gamepad';

function UpButton() {
    const [src, setSrc] = useState("");
    const [pressed, setPressed] = useState(false);
    const [pressedInput, setPressedInput] = useState(false);

    useEffect(() => {
        preload("click");
        preload("hover");
        getPicturePath("wide_v_arrow_up.svg").then(setSrc);

        const handleUp = () => {
            play("click");
            setPressed(true);
            setTimeout(() => {
                setPressed(false);
                setPressedInput(true);
                setTimeout(() => {
                    setPressedInput(false);
                }, 100);
            }, 100);
        };

        on(BUTTONS.DPAD_UP, handleUp);

        return () => {
            off(BUTTONS.DPAD_UP, handleUp);
        };
    }, []);

    const getClassName = () => {
        if (pressed) {
            return `${UpButtonStyle.container} ${UpButtonStyle.selected}`;
        }
        else if (pressedInput) {
            return `${UpButtonStyle.container} ${UpButtonStyle.selectedInput}`;
        }
        return UpButtonStyle.container;
    };

    return (
        <button 
            className={getClassName()}
            onMouseOver={() => play("hover")}
            onClick={() => play("click")}
        >
            {src && <img src={src} />}
        </button>
    )
}

export default UpButton