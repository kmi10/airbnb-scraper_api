export declare class ScraperController {
    scrapeAirbnb(idAirbnb: string | string[], checkin?: string, checkout?: string): Promise<{
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
        favoriteGuestMark?: string;
        error?: string;
    }[] | {
        error: string;
    }>;
}
