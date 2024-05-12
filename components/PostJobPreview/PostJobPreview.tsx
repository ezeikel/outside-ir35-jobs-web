import { useFormContext } from 'react-hook-form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBriefcase,
  faLocationDot,
  faSterlingSign,
} from '@fortawesome/pro-regular-svg-icons';
import HTMLViewer from '../HTMLViewer/HTMLViewer';

const JobPostPreview = () => {
  const { watch } = useFormContext();
  const {
    companyName,
    position,
    jobDescription,
    // TODO:
    // keywords,
    location,
    // companyLogo,
    dayRate,
    // howToApply,
    // applicationEmail,
    workMode,
    // companyTwitter,
    // companyEmail,
    // invoiceAddress,
  } = watch();

  return (
    <div className="flex flex-col gap-y-4 bg-gray-100 p-4 rounded-lg editor-preview">
      <h2 className="text-2xl font-bold">Job Preview</h2>
      <div className="flex flex-col gap-y-4 bg-white p-4 rounded-lg shadow-md">
        {position ? <h3 className="text-xl font-bold">{position}</h3> : null}
        {companyName ? <p className="text-gray-600">{companyName}</p> : null}
        {location.address ? (
          <div className="flex items-center gap-x-2">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="text-gray-600"
              size="lg"
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
                size="lg"
              />
              <p className="text-gray-600">{dayRate} per day</p>
            </div>
          ) : null}
          {workMode ? (
            <div className="flex items-center gap-x-2">
              <FontAwesomeIcon
                icon={faBriefcase}
                className="text-gray-600"
                size="lg"
              />
              <p className="text-gray-600">
                {workMode.charAt(0).toUpperCase() + workMode.slice(1)}
              </p>
            </div>
          ) : null}
        </div>
        {jobDescription ? (
          <div>
            <h3 className="text-lg font-bold">About the job</h3>
            <HTMLViewer html={jobDescription} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JobPostPreview;
