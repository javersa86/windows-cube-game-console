import { useState, useEffect } from "react";
import DownButtonStyle from "../../styles/DownButton.module.css"
import { preload, play } from "../../utils/sound.js";
import { getPicturePath } from "../../utils/assets.js";
import { on, off, BUTTONS } from '../../utils/gamepad';


function DownButton() {
    const [src, setSrc] = useState("");
    const [pressed, setPressed] = useState(false);
    const [pressedInput, setPressedInput] = useState(false);

    useEffect(() => {
        preload("click");
        preload("hover");
        getPicturePath("wide_v_arrow_down.svg").then(setSrc);

        const handleDown = () => {
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

        on(BUTTONS.DPAD_DOWN, handleDown);

        return () => {
            off(BUTTONS.DPAD_DOWN, handleDown);
        };
    }, []);

    const getClassName = () => {
        if (pressed) {
            return `${DownButtonStyle.container} ${DownButtonStyle.selected}`;
        }
        else if (pressedInput) {
            return `${DownButtonStyle.container} ${DownButtonStyle.selectedInput}`;
        }
        return DownButtonStyle.container;
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

export default DownButton;