import style from './IntroCard.css';
import progress from '../widgets/Progress';
import Vue from 'vue';

export default Vue.extend({
    template: `<div
            class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col ${style.logoBackgroundContainer}">
            <div class=${style.logoBackground}></div>
            <div class="mdl-card__title">
                <h2 class="mdl-card__title-text">Это Public Radio</h2>
            </div>
            <div class="mdl-card__supporting-text">
                <div style="width: 90%">
                    <p>Public Radio - это некоммерческий музыкальный проект</p>
                    <p>Он не хранит никаких данных о вас: все, что он использует - это публично доступные данные с VK</p>
                    <p>Вся музыка, которая играет на Public Radio берется из сообществ Вконтакте. Она недоступна для прямого скачивания и недоступна для прямого прослушивания, услышать конкретный трек можно только случайно - Public Radio играет аудиозаписи в случайном порядке</p>
                    <p>Перед Public Radio не стоит задача зарабатывать деньги, быть проданным или собирать данные пользователей: он был придуман и сделан с удовольствием и исключительно для удовольствия</p>

                    <p>Автор Public Radio - <a href="https://vk.com/vsevolod.rodionov">Сева Родионов</a></p>
                </div>
            </div>
        </div>
        <div class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col">
            <div class="mdl-card__title"><h2 class="mdl-card__title-text">Если вы разработчик...</h2></div>
            <div class="mdl-card__supporting-text">
                <p>Все исходники Public Radio доступны для изучения на <a href="https://github.com/PublicRadio/publicradio.io">GitHub</a></p>
                <p>Если вы разработчик - пожалуйста, обратите внимание: программный код распространятеся под лицензией Artistic License 2.0</p>
                <p>Это в том числе значит, что вы можете изменять и использовать измененный программный продукт - но только при условии, что вы не станете его распространять. (это не относится к исходному коду программного продукта) </p>
                <p>Это сделано для защиты от тех разработчиков, которые решат так или иначе заработать, сделав форк и, например, вставив рекламу.</p>
                <p></p>
                <p><i>Сева Родионов</i></p>
            </div>
        </div>
        `
});

