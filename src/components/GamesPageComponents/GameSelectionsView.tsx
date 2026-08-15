import GameSelectionsViewStyle from "/src/styles/GameSelectionsView.module.css"
import UpButton from "../Buttons/UpButton"
import DownButton from "../Buttons/DownButton"

interface GameTitles {
    prevGame: string;
    currentGame: string;
    nextGame: string;
}

function GameSelectionsView(gameTitles: GameTitles) {
    return (
            <div className={GameSelectionsViewStyle.container}>
                <UpButton />
                <span className={GameSelectionsViewStyle.prevText}>{gameTitles.prevGame}</span>
                <span className={GameSelectionsViewStyle.currentText} >{gameTitles.currentGame}</span>
                <span className={GameSelectionsViewStyle.nextText} >{gameTitles.nextGame}</span>
                <DownButton />
            </div>
    )
}

export default GameSelectionsView