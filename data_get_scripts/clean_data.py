import pandas as pd
import re

STORE_NAMES = ['Lidl', 'Biedronka', 'Carrefour', 'Intermarché', 'Intermarche','Aldi','Żabka','Zabka','Kaufland','Dealz','Dino','Stokrotka','Topaz','Twój market','Auchan','BP','Circle K','Eurocash','Bitcoin','Arhelan']

def clean_address(addr):
    # Usuń nazwę sklepu na początku
    s = addr.strip()
    for name in STORE_NAMES:
        regex = rf'^{name}[,\s]*'
        s = re.sub(regex, '', s, flags=re.IGNORECASE)
    # Usuń kod pocztowy w formatach: 00-000, 00000 oraz 000 00
    s = re.sub(r'\b\d{2,3}[- ]?\d{2,3}\b', '', s)   # np 31-511, 460 06, 76005
    s = re.sub(r',\s*,', ',', s)                    # dziwne podwójne przecinki po usuwaniu
    s = re.sub(r',\s+', ', ', s)                    # popraw przecinki
    s = re.sub(r'\s+,', ',', s)                     # przecinki bez spacji przed
    # Usuń 'Poland' na końcu
    s = re.sub(r',?\s*Poland$', '', s)
    return s.strip(' ,')

def main():
    # Wczytaj dane
    df = pd.read_csv('sklepy_z_adresami_live.csv', encoding='utf-8')

    # Nadpisz/utwórz nową kolumnę address oryginalnym new_address (czyli nowy adres)
    df['address'] = df['new_address'].astype(str)
    # Wyczyść adres
    df['address'] = df['address'].map(clean_address)
    # Usuń starą kolumnę address (jeśli chcesz)
    if 'new_address' in df.columns:
        df = df.drop(columns=['new_address'])

    # Eksportuj do nowego pliku CSV (zmodyfikowanego)
    df.to_csv('sklepy_adresy_clean.csv', index=False, encoding='utf-8')

    print('Gotowe! Nowy plik: sklepy_adresy_clean.csv')

if __name__ == '__main__':
    main()
