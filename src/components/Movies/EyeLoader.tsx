import React from "react";

export const EyeLoader: React.FC = () => {
  return (
    <div className="nl-eye-loader-wrap" aria-hidden="true">
      <div className="eye-lid">
        <div className="eye">
          <div className="cornea">
            <div className="white-pupil" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EyeLoader;
