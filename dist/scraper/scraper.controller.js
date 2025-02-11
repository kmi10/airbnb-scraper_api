"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperController = void 0;
const common_1 = require("@nestjs/common");
const puppeteer = require("puppeteer");
const getFormattedDate = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
};
let ScraperController = class ScraperController {
    async scrapeAirbnb(idAirbnb, checkin, checkout) {
        if (!idAirbnb) {
            return { error: 'Debe proporcionar al menos un parámetro idarirbnb' };
        }
        const checkinDate = checkin || getFormattedDate(30);
        const checkoutDate = checkout || getFormattedDate(33);
        const ids = Array.isArray(idAirbnb) ? idAirbnb : [idAirbnb];
        const results = [];
        console.log(`🔍 Buscando propiedades: ${ids.join(', ')}`);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        });
        await Promise.all(ids.map(async (id) => {
            const url = `https://www.airbnb.cl/rooms/${id}?check_in=${checkinDate}&check_out=${checkoutDate}`;
            console.log(`🌍 Extrayendo datos de: ${url}`);
            const page = await browser.newPage();
            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                await new Promise(resolve => setTimeout(resolve, 5000));
                const listingData = await page.evaluate(() => {
                    const getText = (selector) => {
                        const element = document.querySelector(selector);
                        return element ? element.textContent?.trim() || 'Sin datos' : 'Sin datos';
                    };
                    const airbnbIdMatch = window.location.href.match(/\/rooms\/(\d+)/);
                    const airbnbId = airbnbIdMatch ? airbnbIdMatch[1] : 'Sin ID';
                    const favoriteGuestBanner = document.querySelector('div.lbjrbi0');
                    let favoriteGuest = "No";
                    let ratingText, reviewsText;
                    if (favoriteGuestBanner) {
                        favoriteGuest = 'Favorito entre huéspedes';
                        ratingText = getText('div[data-testid="pdp-reviews-highlight-banner-host-rating"] div[aria-hidden="true"]');
                        reviewsText = getText('div[data-testid="pdp-reviews-highlight-banner-host-review"] div[aria-hidden="true"]');
                    }
                    else {
                        ratingText = getText('div.r1lutz1s');
                        reviewsText = getText('a[href*="/reviews"]');
                    }
                    const info = Array.from(document.querySelectorAll('li.l7n4lsf')).reduce((result, el) => {
                        const text = el.innerText.trim().toLowerCase();
                        if (['huéspedes', 'huésped'].some(term => text.includes(term))) {
                            result.guests = text;
                        }
                        else if (['habitación', 'habitaciones'].some(term => text.includes(term))) {
                            result.rooms = text;
                        }
                        else if (['cama', 'camas'].some(term => text.includes(term))) {
                            result.beds = text;
                        }
                        else if (['baño', 'baños'].some(term => text.includes(term))) {
                            result.bathrooms = text;
                        }
                        return result;
                    }, { guests: '', rooms: '', beds: '', bathrooms: '' });
                    return {
                        airbnbId,
                        title: getText('h1'),
                        description: getText('div.toieuka h2'),
                        priceOriginal: getText('span._1aejdbt'),
                        priceCurrent: getText('span._11jcbg2'),
                        rating: ratingText,
                        reviews: reviewsText,
                        guests: info.guests.replace('·', '').trim() || 'Sin datos de huéspedes',
                        rooms: info.rooms.replace('·', '').trim() || 'Sin datos de habitaciones',
                        beds: info.beds.replace('·', '').trim() || 'Sin datos de camas',
                        bathrooms: info.bathrooms.replace('·', '').trim() || 'Sin datos de baños',
                        host: getText('div.t1pxe1a4').replace('Anfitrión: ', '').trim() || 'Sin datos de host',
                        favoriteGuestMark: favoriteGuest || 'Sin datos de host'
                    };
                });
                console.log(`✅ Datos extraídos para ${id}:`, listingData);
                results.push(listingData);
            }
            catch (error) {
                console.error(`❌ Error al extraer datos de ${url}:`, error);
                results.push({ airbnbId: id, error: 'No se pudo extraer información' });
            }
            finally {
                await page.close();
            }
        }));
        await browser.close();
        return results;
    }
};
exports.ScraperController = ScraperController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('idarirbnb')),
    __param(1, (0, common_1.Query)('checkin')),
    __param(2, (0, common_1.Query)('checkout')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "scrapeAirbnb", null);
exports.ScraperController = ScraperController = __decorate([
    (0, common_1.Controller)('scraper')
], ScraperController);
//# sourceMappingURL=scraper.controller.js.map