import { Color, Node } from 'cc';
import { CuteTheme, panel, progress, text } from '../../cute/CuteUiKit';
import { PetAptitudeV6 } from './PetTypes';

export function renderPetAptitudePanelV6(parent: Node, aptitudes: PetAptitudeV6[], score: number, range: string, growth: number) {
    text(parent, 'Heading', '资质与成长', -218, 198, 436, 34, 19, CuteTheme.caramel, 'left', true);
    text(parent, 'Summary', `综合评分 ${score}　·　${range}　·　成长 ${growth.toFixed(3)}`, 0, 164, 438, 28, 14, CuteTheme.honeyDark, 'center', true);
    aptitudes.forEach((aptitude, index) => {
        const precision = aptitude.precision ?? 0;
        const value = aptitude.value.toFixed(precision);
        const maximum = aptitude.maximum.toFixed(precision);
        const minimum = aptitude.minimum.toFixed(precision);
        const row = panel(parent, `Aptitude_${index}`, 0, 116 - index * 50, 444, 44, new Color(255, 252, 239, 238), 14, false, new Color(218, 178, 122, 205), 2);
        text(row, 'Label', `${aptitude.icon} ${aptitude.label}`, -206, 9, 116, 22, 12, CuteTheme.caramel, 'left', true);
        text(row, 'Value', `${value} / ${maximum}`, -82, 9, 140, 22, 12, CuteTheme.honeyDark, 'left', true);
        text(row, 'Grade', `档位：${aptitude.grade}`, 68, 9, 128, 22, 12, CuteTheme.caramel, 'left', true);
        text(row, 'Range', `范围 ${minimum}–${maximum}`, -82, -11, 146, 18, 11, CuteTheme.muted, 'left', true);
        progress(row, 'Progress', 108, -11, 196, 8, Math.min(1, Math.max(0, aptitude.value / Math.max(0.0001, aptitude.maximum))), CuteTheme.mintDark);
    });
    const rangePanel = panel(parent, 'Range', 0, -198, 444, 42, new Color(244, 238, 255, 245), 14, false, new Color(193, 169, 221, 210), 2);
    text(rangePanel, 'Value', '当前值、物种上限与档位随所选宝宝实时刷新', 0, 0, 414, 24, 12, CuteTheme.caramel, 'center', true);
}
