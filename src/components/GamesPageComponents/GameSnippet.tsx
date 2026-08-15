import style from '/src/styles/GameSnippet.module.css'

interface Props {
    src: string;
}

function GameSnippet(props: Props) {
    const src = props.src.startsWith('file://') ? props.src : `file://${props.src}`;
    
    return (
        <div className={style.gameSnippetContainer}>
            <video
                src={src}
                autoPlay
                loop
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        </div>
    )
}

export default GameSnippet