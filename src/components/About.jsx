import React from 'react'
import { Tilt } from 'react-tilt'
import {motion} from 'framer-motion';
import {styles} from '../styles';
import {services} from '../constants';
import {fadeIn, textVariant} from '../utils/motion'
import { SectionWrapper } from '../hoc';


const ServiceCard = ({index,title,icon}) => {
  return (
    <Tilt className="xs:w-[250px] w-full">
      <motion.div variants={fadeIn("right","spring",0.5*index,0.75)}
      className='w-full green-pink-gradient p-[1px] rounded-[20px] shadow-card'>
        <div options={{
          max:45,
          scale:1,
          speed:450
        }} className='bg-tertiary rounded-[20px] py-5 px-12 min-h-[280px] flex justify-evenly items-center flex-col'>

          <img src={icon} alt={title} className='w-16 h-16 object-contain' />
          <h3 className='text-white text-20[px] font-bold text-center'>
            {title}
          </h3>

        </div>

      </motion.div>
    </Tilt>
  )
}



const About = () => {
  return (
    <>
    <motion.div variants={textVariant()}>
      <p className={styles.sectionSubText}>
        Introduction
      </p>
      <h2 className={styles.sectionHeadText}>
        Overview.
      </h2>
    </motion.div>

    <motion.p variants={fadeIn("","",0.1,1)}
    className="mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]">
    A Software Development Engineer (SDE) designs, develops, tests, and maintains software applications. They write clean, efficient code, create and execute tests, and fix bugs to ensure high-quality software. SDEs collaborate with cross-functional teams, participate in code reviews, and document their work. Key skills include proficiency in programming languages (e.g., Java, Python), understanding of algorithms and data structures, and strong problem-solving abilities. They also stay updated with the latest technology trends. SDEs play a vital role in building reliable, scalable software solutions and contributing to the overall success of tech projects.
    </motion.p>

    <div className='mt-20 flex flex-wrap gap-10'>
      {services.map((service,index) => (
        <ServiceCard key={service.title} index={index} {...service}/>
      
      
      ))}

    </div>


    </>
  )
}

export default SectionWrapper(About, "about")