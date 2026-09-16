import CubeLayout from "../components/CubeLayout";
import MenuOption from "../components/Buttons/MenuOption";
import CubeLayoutStyle from "../styles/CubeLayout.module.css";
import { on, off, BUTTONS } from '../utils/gamepad';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { preload, play } from "../utils/sound.js";

const MENU_ITEMS = [
    { text: "Apps", dst: "/games" },
    { text: "Options", dst: "/options" },
    { text: "Quit", dst: "/quit" },
];

function MainMenu() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [pressedIndex, setPressedIndex] = useState<number | null>(null);
    const selectedIndexRef = useRef(0);
    const navigate = useNavigate();

    useEffect(() => {
        preload("hover");
        preload("click");

        const handleUp = () => {
            const next = Math.max(0, selectedIndexRef.current - 1);
            selectedIndexRef.current = next;
            setSelectedIndex(next);
            play("hover");
        }

        const handleDown = () => {
            const next = Math.min(MENU_ITEMS.length - 1, selectedIndexRef.current + 1);
            selectedIndexRef.current = next;
            setSelectedIndex(next);
            play("hover");
        }

        const handleA = () => {
            setPressedIndex(selectedIndexRef.current);
            setTimeout(() => {
                navigate(MENU_ITEMS[selectedIndexRef.current].dst);
                play("click");
            }, 150);
        }

        on(BUTTONS.A, handleA);
        on(BUTTONS.DPAD_UP, handleUp);
        on(BUTTONS.DPAD_DOWN, handleDown);

        return () => {
            off(BUTTONS.A, handleA);
            off(BUTTONS.DPAD_UP, handleUp);
            off(BUTTONS.DPAD_DOWN, handleDown);
        };
    
    }, []);

    return (
        <CubeLayout width="640px" height="640px">
            <h1>Cube Launcher</h1>
            <div className={CubeLayoutStyle.container}>
                {MENU_ITEMS.map((item, index) => (
                    <MenuOption
                        key={item.dst}
                        dst={item.dst}
                        text={item.text} 
                        selected={index === selectedIndex}
                        pressed={index === pressedIndex}
                    />
                ))}
            </div>
            <div className={CubeLayoutStyle.bottomLeft}>
                <p>Press Up/Down to Navigate</p>
                <p>Press A to Select</p>
            </div>
        </CubeLayout>
    )
}

export default MainMenu;