import React, { memo } from 'react';

interface Props {
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
}

const PersonalPhotoFloaterInner: React.FC<Props> = () => null;

export const PersonalPhotoFloater = memo(PersonalPhotoFloaterInner);