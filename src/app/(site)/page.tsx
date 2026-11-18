import Image from "next/image";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { Container } from "@/components/Container";
import SectionDivider from "@/components/SectionDivider";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import styles from "./page.module.css";

// Until Home is built (L-01), it lists the images that have a viewer page.
const Home = () => {
  const { images } = getContent();
  const tileBaseUrl = resolveTileBase(process.env.TILE_BASE_URL);

  return (
    <Container>
      <h1 className={styles.title}>NASA 2025 Solaria</h1>
      <h2 className={styles.subtitle}>Explore the Universe in Unprecedented Detail</h2>
      <p className={styles.intro}>
        NASA{`\’`}s space missions produce some of the largest and most detailed
        images ever captured, far beyond what your screen, or even your eyes,
        can take in at once. With Solaria, you can explore, zoom,
        compare, and analyze these ultra-high-resolution images in different ways.
      </p>
      <SectionDivider />
      <ul className={styles.images} aria-label="Images">
        {images.map((image) => (
          <li key={image.id}>
            <Link href={`/${image.id}/`} className={styles.card}>
              <span className={styles.thumb}>
                <Image
                  src={`${tileBaseUrl}/${image.id}/thumbnail.jpg`}
                  width={image.tiles.thumbnail.width}
                  height={image.tiles.thumbnail.height}
                  alt=""
                  unoptimized
                />
              </span>
              <span className={styles.cardTitle}>{image.title}</span>
              <span className={styles.cardAction}>
                Explore
                <LuArrowRight aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
};

export default Home;
