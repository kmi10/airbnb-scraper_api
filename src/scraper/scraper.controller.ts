import { Controller, Get, Query } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

// 🔹 Función para obtener la fecha en formato YYYY-MM-DD
const getFormattedDate = (offsetDays = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
};

@Controller('scraper')
export class ScraperController {
  
  @Get()
  async scrapeAirbnb(
    @Query('idarirbnb') idAirbnb: string | string[],
    @Query('checkin') checkin?: string,
    @Query('checkout') checkout?: string,
  ) {
    if (!idAirbnb) {
       return { error: 'Debe proporcionar al menos un parámetro idarirbnb' };
    }

    // 🔹 Si faltan fechas, usar valores por defecto
    const checkinDate = checkin || getFormattedDate(30);
    const checkoutDate = checkout || getFormattedDate(33);

    // Asegurar que los IDs sean un array
    const ids = Array.isArray(idAirbnb) ? idAirbnb : [idAirbnb];
    const results: Array<{
      airbnbId: string;
      title?: string;
      description?: string;
      priceOriginal?: string;
      priceCurrent?: string;
      rating?: string;
      reviews?: string;
      guests?: string;
      rooms?: string;
      beds?: string;
      bathrooms?: string;
      host?: string;
      favoriteGuestMark?:string;
      error?: string;
    }> = [];

    console.log(`🔍 Buscando propiedades: ${ids.join(', ')}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    // 🔹 Procesar los IDs en paralelo usando `Promise.all`
    await Promise.all(ids.map(async (id) => {
      const url = `https://www.airbnb.cl/rooms/${id}?check_in=${checkinDate}&check_out=${checkoutDate}`;
      console.log(`🌍 Extrayendo datos de: ${url}`);

      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const listingData = await page.evaluate(() => {
          const getText = (selector: string) => {
              const element = document.querySelector(selector);
              return element ? (element as HTMLElement).textContent?.trim() || 'Sin datos' : 'Sin datos';
          };
      
          const airbnbIdMatch = window.location.href.match(/\/rooms\/(\d+)/);
          const airbnbId = airbnbIdMatch ? airbnbIdMatch[1] : 'Sin ID';
      
          // 🔹 Verificar si el anuncio tiene el banner "Favorito entre huéspedes"
          const favoriteGuestBanner = document.querySelector('div.lbjrbi0');
          let favoriteGuest = "No";
          let ratingText, reviewsText;
      
          if (favoriteGuestBanner) {
              // Si el apartamento es "Favorito entre huéspedes", usar los nuevos selectores
              favoriteGuest = 'Favorito entre huéspedes';
              ratingText = getText('div[data-testid="pdp-reviews-highlight-banner-host-rating"] div[aria-hidden="true"]');
              reviewsText = getText('div[data-testid="pdp-reviews-highlight-banner-host-review"] div[aria-hidden="true"]');
          } else {
              // Si no es "Favorito entre huéspedes", usar los selectores tradicionales
              ratingText = getText('div.r1lutz1s');
              reviewsText = getText('a[href*="/reviews"]');
          }
      
          const info = Array.from(document.querySelectorAll('li.l7n4lsf')).reduce((result, el) => {
              const text = (el as HTMLElement).innerText.trim().toLowerCase();
      
              if (['huéspedes', 'huésped'].some(term => text.includes(term))) {
                  result.guests = text;
              } else if (['habitación', 'habitaciones'].some(term => text.includes(term))) {
                  result.rooms = text;
              } else if (['cama', 'camas'].some(term => text.includes(term))) {
                  result.beds = text;
              } else if (['baño', 'baños'].some(term => text.includes(term))) {
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
              favoriteGuestMark:favoriteGuest || 'Sin datos de host'
          };
      });      

        console.log(`✅ Datos extraídos para ${id}:`, listingData);
        results.push(listingData);
      } catch (error) {
        console.error(`❌ Error al extraer datos de ${url}:`, error);
        results.push({ airbnbId: id, error: 'No se pudo extraer información' });
      } finally {
        await page.close();
      }
    }));

    await browser.close();
    return results;
  }
}
