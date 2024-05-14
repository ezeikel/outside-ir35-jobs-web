import { useFormContext } from 'react-hook-form';
import { WorkMode } from '@prisma/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBriefcase,
  faBuilding,
  faLaptopHouse,
  faLocationDot,
  faSterlingSign,
  faSync,
} from '@fortawesome/pro-regular-svg-icons';
import HTMLViewer from '../HTMLViewer/HTMLViewer';

const JobPostPreview = () => {
  const { watch } = useFormContext();
  const {
    companyName,
    position,
    description,
    location,
    // companyLogo,
    dayRate,
    howToApply,
    workMode,
  } = watch();

  let workModeIcon;

  switch (workMode) {
    case WorkMode.REMOTE:
      workModeIcon = faLaptopHouse;
      break;
    case WorkMode.HYBRID:
      workModeIcon = faSync;
      break;
    case WorkMode.ON_SITE:
      workModeIcon = faBuilding;
      break;
    default:
      workModeIcon = faBriefcase;
      break;
  }

  return (
    <div className="flex flex-col gap-y-4 bg-gray-100 p-4 rounded-lg editor-preview">
      <h2 className="text-2xl font-bold">Job Preview</h2>
      <div className="flex flex-col gap-y-4 bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col gap-y-2.5">
          {position ? <h3 className="text-xl font-bold">{position}</h3> : null}
          {companyName ? <p className="text-gray-600">{companyName}</p> : null}
          {location.address ? (
            <div className="flex items-center gap-x-2">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="text-gray-600"
                size="sm"
              />

              <p className="text-gray-600">{location.address}</p>
            </div>
          ) : null}
          <div className="flex gap-x-4">
            {dayRate[0] ? (
              <div className="flex items-center gap-x-2">
                <FontAwesomeIcon
                  icon={faSterlingSign}
                  className="text-gray-600"
                  size="sm"
                />
                <p className="text-gray-600">
                  {dayRate.length > 1
                    ? `${dayRate[0]} - ${dayRate[1]}`
                    : dayRate}{' '}
                  per day
                </p>
              </div>
            ) : null}
            {workMode ? (
              <div className="flex items-center gap-x-2">
                <FontAwesomeIcon
                  icon={workModeIcon}
                  className="text-gray-600"
                  size="sm"
                />
                <p className="text-gray-600">
                  {workMode.charAt(0).toUpperCase() + workMode.slice(1)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        {description ? <HTMLViewer html={description} /> : null}
        {howToApply ? <HTMLViewer html={howToApply} /> : null}
      </div>
    </div>
  );
};

export default JobPostPreview;
