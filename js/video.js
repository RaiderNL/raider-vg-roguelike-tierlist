import {
    getVideoUrl,
    getVideoTitle
} from './data.js';


export function getYouTubeThumbnail(
    videoUrl
) {
    const videoId =
        getYouTubeVideoId(
            videoUrl
        );

    if (
        !videoId
    ) {
        return '';
    }

    return (
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    );
}


export function getYouTubeVideoId(
    videoUrl
) {
    const url =
        String(
            videoUrl || ''
        ).trim();

    const patterns = [
        /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]+)/i,
        /youtu\.be\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
    ];

    for (
        const pattern of patterns
    ) {
        const match =
            url.match(
                pattern
            );

        if (
            match
        ) {
            return match[1];
        }
    }

    return '';
}


export function renderSelectedVideo(
    games,
    selectedVideoUrl
) {
    const panel =
        document.querySelector(
            '#selected-video-panel'
        );

    if (
        !panel
    ) {
        return;
    }

    panel.replaceChildren();

    if (
        !selectedVideoUrl
    ) {
        hideSelectedVideoPanel(
            panel
        );

        return;
    }

    const game =
        games.find(
            item =>
                getVideoUrl(
                    item
                ) === selectedVideoUrl
        );

    if (
        !game
    ) {
        hideSelectedVideoPanel(
            panel
        );

        return;
    }

    const videoUrl =
        getVideoUrl(
            game
        );

    const videoTitle =
        getVideoTitle(
            game
        );

    if (
        !videoUrl
    ) {
        hideSelectedVideoPanel(
            panel
        );

        return;
    }

    const thumbnailUrl =
        getYouTubeThumbnail(
            videoUrl
        );

    const title =
        document.createElement(
            'h2'
        );

    title.className =
        'selected-video-title';

    title.textContent =
        videoTitle ||
        'Видеообзор';

    const link =
        document.createElement(
            'a'
        );

    link.className =
        'selected-video-link';

    link.href =
        videoUrl;

    link.target =
        '_blank';

    link.rel =
        'noopener noreferrer';

    link.title =
        'Открыть видео на YouTube';

    if (
        thumbnailUrl
    ) {
        const image =
            document.createElement(
                'img'
            );

        image.className =
            'selected-video-image';

        image.src =
            thumbnailUrl;

        image.alt =
            videoTitle ||
            'Видеообзор игры';

        image.loading =
            'lazy';

        link.appendChild(
            image
        );
    } else {
        const placeholder =
            document.createElement(
                'div'
            );

        placeholder.className =
            'selected-video-placeholder';

        placeholder.textContent =
            '▶';

        link.appendChild(
            placeholder
        );
    }

    const caption =
        document.createElement(
            'span'
        );

    caption.className =
        'selected-video-caption';

    caption.textContent =
        'Открыть видео на YouTube';

    link.appendChild(
        caption
    );

    panel.appendChild(
        title
    );

    panel.appendChild(
        link
    );

    panel.classList.add(
        'is-visible'
    );

    panel.setAttribute(
        'aria-hidden',
        'false'
    );
}


function hideSelectedVideoPanel(
    panel
) {
    panel.classList.remove(
        'is-visible'
    );

    panel.setAttribute(
        'aria-hidden',
        'true'
    );
}
