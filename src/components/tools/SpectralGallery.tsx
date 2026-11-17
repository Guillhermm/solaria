"use client";

import React, { useEffect, useState } from "react";
import { Card, Row, Col, Spinner } from "react-bootstrap";
import { SpectralGalleryProps } from "@/types";


export default function SpectralGallery({
  title,
  images,
  initialImageId,
}: SpectralGalleryProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());
  const [currentId, setCurrentId] = useState<string>(
    initialImageId ?? (images.length > 0 ? images[0].id : "")
  );

  // Preload images
  useEffect(() => {
    const promises = images.map((img) => {
      return new Promise<void>((resolve) => {
        const i = new Image();
        i.src = img.url;
        i.onload = () => {
          setLoadedSet((prev) => {
            const s = new Set(prev);
            s.add(img.id);
            return s;
          });
          resolve();
        };
        i.onerror = () => {
          console.warn("Failed to load image:", img.url);
          resolve();
        };
      });
    });
    Promise.all(promises).then(() => {
      setLoading(false);
    });
  }, [images]);

  const currentImage = images.find((img) => img.id === currentId);

  return (
    <div className="spectral-gallery">
      <h2>{title}</h2>
      <div className="mb-4">Browse a small set of NASA images and pick one from the thumbnails.</div>
      {loading && (
        <div className="text-center my-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading images...</span>
          </Spinner>
        </div>
      )}
      {currentImage && (
        <>
          <h3>{currentImage.title}</h3>
          <Row className="gap-3">
            {/* Main image */}
            <Col xs={12} lg={8}>
              <Card className="gallery-main-card">
                <Card.Img
                  variant="top"
                  src={currentImage.url}
                  alt={currentImage.title}
                  className="gallery-main-img rounded-0"
                />
              </Card>
            </Col>

            {/* Thumbnails */}
            <Col xs={12} lg={2}>
              <Row xs={3} sm={4} md={2} lg={1} className="gap-lg-3">
                {images.map((img) => (
                  <Col key={img.id}>
                    <Card
                      className={`thumbnail-card rounded-0 ${
                        img.id === currentId ? "thumbnail-selected" : ""
                      }`}
                      onClick={() => setCurrentId(img.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <Card.Img
                        variant="top"
                        src={img.thumbnailUrl ?? img.url}
                        alt={img.title}
                        className="thumbnail-img rounded-0"
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
