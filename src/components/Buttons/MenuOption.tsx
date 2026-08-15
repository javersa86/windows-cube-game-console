import style from "../../styles/MenuOption.module.css"
import lableStyle from "../../styles/CubeLayout.module.css";
import { preload, play } from "../../../electron/utils/sound.js";
import { Link } from 'react-router-dom';

preload("click");
preload("hover");

interface Props {
    dst: string;
    text: string;
    selected: boolean;
    pressed: boolean;
}

function MenuOption(props: Props) {
    const className = props.pressed
        ? `${lableStyle.label} ${style.selectedInput}`
        : props.selected
        ? `${lableStyle.label} ${style.selected}`
        : lableStyle.label;

    return (
        <Link
            to={props.dst}
            className={className}
            onMouseOver={() => play("hover")}
            onClick={() => play("click")}
        >
            {props.text}
        </Link>
    )
}

export default MenuOption;