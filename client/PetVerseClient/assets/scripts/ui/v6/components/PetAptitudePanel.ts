import { Color, Node } from 'cc';
import { CuteTheme, panel, progress, text } from '../../cute/CuteUiKit';
import { PetAptitudeV6 } from './PetTypes';

export function renderPetAptitudePanelV6(parent: Node, aptitudes: PetAptitudeV6[], score: number, range: string, growth: number) {
    text(parent, 'Heading', '资质与成长', -232, 224, 464, 34, 19, CuteTheme.caramel, 'left', true);
    text(parent, 'Summary', `综合评分 ${score}　·　${range}`, 0, 188, 470, 28, 14, CuteTheme.honeyDark, 'center', true);
    aptitudes.forEach((aptitude, index) => {
        const precision = aptitude.precision ?? 0;
        const value = aptitude.value.toFixed(precision);
        const maximum = aptitude.maximum.toFixed(precision);
        const minimum = aptitude.minimum.toFixed(precision);
        const row = panel(parent, `Aptitude_${index}`, 0, 132 - index * 58, 476, 52, new Color(255, 252, 239, 238), 15, false, new Color(218, 178, 122, 205), 2);
        text(row, 'Label', `${aptitude.icon} ${aptitude.label}`, -222, 11, 128, 25, 13, CuteTheme.caramel, 'left', true);
        text(row, 'Value', `${value} / ${maximum}`, -86, 11, 150, 25, 13, CuteTheme.honeyDark, 'left', true);
        text(row, 'Grade', `档位：${aptitude.grade}`, 76, 11, 136, 25, 12, CuteTheme.caramel, 'left', true);
        text(row, 'Range', `范围 ${minimum}–${maximum}`, -86, -13, 154, 20, 11, CuteTheme.muted, 'left', true);
        progress(row, 'Progress', 116, -13, 210, 10, Math.min(1, Math.max(0, aptitude.value / Math.max(0.0001, aptitude.maximum))), CuteTheme.mintDark);
    });
    const rangePanel = panel(parent, 'Range', 0, -224, 476, 48, new Color(244, 238, 255, 245), 15, false, new Color(193, 169, 221, 210), 2);
    text(rangePanel, 'Value', '当前值、物种上限与档位均随所选宝宝实时刷新', 0, 0, 438, 26, 12, CuteTheme.caramel, 'center', true);
}
