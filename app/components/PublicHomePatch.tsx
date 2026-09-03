'use client';

import { useEffect } from 'react';

export default function PublicHomePatch() {
  useEffect(() => {
    const founderImage = document.querySelector<HTMLImageElement>('img[alt="Hildeberto Junior, fundador da Axven Digital"]');
    if (founderImage) {
      founderImage.src = '/IMG_6518.PNG';
      founderImage.classList.remove('aspect-[4/5]', 'object-cover', 'object-top');
      founderImage.classList.add('w-full', 'h-auto', 'object-contain');
      founderImage.style.display = 'block';
      founderImage.style.maxHeight = '720px';
      founderImage.style.objectFit = 'contain';
      founderImage.style.objectPosition = 'center';
      founderImage.parentElement?.classList.add('bg-[#111117]');
    }

    const headerBrand = document.querySelector<HTMLAnchorElement>('header a[aria-label="Axven Digital"]');
    if (headerBrand) {
      const headerLogo = headerBrand.querySelector<HTMLImageElement>('img');
      const headerText = headerBrand.querySelector<HTMLDivElement>('div');
      if (headerLogo) {
        headerLogo.src = '/pasted-1788289300144-0.png';
        headerLogo.alt = 'Axven Digital';
        headerLogo.className = 'h-9 w-auto object-contain sm:h-10';
      }
      if (headerText) headerText.style.display = 'none';
    }

    document.querySelectorAll('p').forEach((paragraph) => {
      if (paragraph.textContent?.includes('A Axven nasceu da evolução de uma operação focada em mídia para uma empresa')) {
        paragraph.textContent = 'A Axven nasceu da evolução de uma operação focada em mídia paga para uma empresa que integra estratégia, tecnologia, automação e dados.';
      }
    });

    document.querySelectorAll<HTMLAnchorElement>('a[href="/login"]').forEach((link) => {
      if (link.textContent?.trim() === 'Área do cliente') link.remove();
    });
  }, []);

  return null;
}
