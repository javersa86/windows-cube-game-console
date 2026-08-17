import { useNavigate } from 'react-router-dom'
import CancelButtonStyle from "../../styles/CancelButton.module.css"
import { preload, play } from "../../utils/sound.js";
import { on, off, BUTTONS } from '../../utils/gamepad';
import { useEffect, useState } from 'react';

preload("click");
preload("hover");

interface Props {
    dst: string;
}

function CancelButton(props: Props) {
    const navigate = useNavigate()
    const [pressed, setPressed] = useState(false);
    const [pressedInput, setPressedInput] = useState(false);

    useEffect(() => {
        const handleB = () => {
            play("click");
            setPressed(true);           // darkred first
            setTimeout(() => {
                setPressed(false);
                setPressedInput(true);  // then red
                setTimeout(() => {
                    setPressedInput(false);
                    navigate(props.dst);
                }, 100);
            }, 100);
        };

        on(BUTTONS.B, handleB);

        return () => {
            off(BUTTONS.B, handleB);
        };
    }, [props.dst]);

    const getClassName = () => {
        if (pressed) {
            return `${CancelButtonStyle.container} ${CancelButtonStyle.pressed}`;
        }
        else if (pressedInput) {
            return `${CancelButtonStyle.container} ${CancelButtonStyle.pressedInput}`;
        }
        return CancelButtonStyle.container;
    };

    return (
        <button
            className={getClassName()}
            onMouseOver={() => {
                play("hover");
            }}
            onClick={() => {
                play("click");
                navigate(props.dst);
            }}>
            Cancel (B)
        </button>
    )
}

export default CancelButton