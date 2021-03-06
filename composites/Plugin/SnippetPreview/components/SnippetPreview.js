// External dependencies.
import React, { PureComponent } from "react";
import styled from "styled-components";
import interpolateComponents from "interpolate-components";
import transliterate from "yoastseo/js/stringProcessing/transliterate";
import createWordRegex from "yoastseo/js/stringProcessing/createWordRegex";
import replaceSpecialCharactersAndDiacritics from "yoastseo/js/stringProcessing/replaceDiacritics";
import PropTypes from "prop-types";
import truncate from "lodash/truncate";
import partial from "lodash/partial";
import { parse } from "url";
import { __ } from "@wordpress/i18n";

// Internal dependencies.
import FixedWidthContainer from "./FixedWidthContainer";
import colors from "../../../../style-guide/colors";
import FormattedScreenReaderMessage from "../../../../a11y/FormattedScreenReaderMessage";
import { DEFAULT_MODE, MODE_DESKTOP, MODE_MOBILE, MODES } from "../constants";
import HelpTextWrapper from "../components/HelpTextWrapper";

/*
 * These colors should not be abstracted. They are chosen because Google renders
 * the snippet like this.
 */
const colorTitle = "#1e0fbe";
const colorUrl = "#006621";
const colorDescription = "#545454";
const colorGeneratedDescription = "#777";
const colorDate = "#808080";

const MAX_WIDTH = 600;
const WIDTH_PADDING = 20;
const DESCRIPTION_LIMIT = 280;

export const DesktopContainer = styled( FixedWidthContainer )`
	background-color: white;
	font-family: arial, sans-serif;
	box-sizing: border-box;
`;

const MobileContainer = styled.div`
	border-bottom: 1px hidden #fff;
	border-radius: 2px;
	box-shadow: 0 1px 2px rgba(0,0,0,.2);
	margin: 0 20px 10px;
	font-family: Arial, Roboto-Regular, HelveticaNeue, sans-serif;
	max-width: ${ MAX_WIDTH }px;
	box-sizing: border-box;
	font-size: 14px;
`;

const angleRight = ( color ) => "data:image/svg+xml;charset=utf8," + encodeURIComponent(
	'<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg">' +
		'<path fill="' + color + '" d="M1152 896q0 26-19 45l-448 448q-19 19-45 19t-45-19-19-45v-896q0-26 19-45t45-19 45 19l448 448q19 19 19 45z" />' +
	"</svg>"
);

export const BaseTitle = styled.div`
	cursor: pointer;
	position: relative;
`;

/**
 * Adds caret styles to a component.
 *
 * @param {ReactComponent} WithoutCaret The component without caret styles.
 * @param {string} color The color to render the caret in.
 * @param {string} mode The mode the snippet preview is in.
 *
 * @returns {ReactComponent} The component with caret styles.
 */
function addCaretStyle( WithoutCaret, color, mode ) {
	return styled( WithoutCaret )`
		&::before {
			display: block;
			position: absolute;
			top: -3px;
			left: ${ () => mode === MODE_DESKTOP ? "-22px" : "-40px" };
			width: 24px;
			height: 24px;
			background-image: url( ${ () => angleRight( color ) } );
			background-size: 25px;
			content: "";
		}
	`;
}

export const Title = styled.div`
	color: ${ colorTitle };
	text-decoration: none;
	font-size: 18px;
	line-height: 1.2;
	font-weight: normal;
	margin: 0;

	display: inline-block;
	overflow: hidden;
	max-width: ${ MAX_WIDTH }px;
	vertical-align: top;
	text-overflow: ellipsis;
`;

export const TitleBounded = styled( Title )`
	max-width: ${ MAX_WIDTH }px;
	vertical-align: top;
	text-overflow: ellipsis;
`;

export const TitleUnboundedDesktop = styled.span`
	white-space: nowrap;
`;

export const TitleUnboundedMobile = styled.span`
	display: inline-block;
	font-size: 16px;
	line-height: 1.2em;
	max-height: 2.4em; // max two lines of text
	overflow: hidden;
	text-overflow: ellipsis;
`;

export const BaseUrl = styled.div`
	display: inline-block;
	color: ${ colorUrl };
	cursor: pointer;
	position: relative;
	max-width: 90%;
	white-space: nowrap;
	font-size: 14px;
`;

const BaseUrlOverflowContainer = BaseUrl.extend`
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
`;

BaseUrlOverflowContainer.displayName = "SnippetPreview__BaseUrlOverflowContainer";

export const DesktopDescription = styled.div.attrs( {
	color: ( props ) => props.isDescriptionGenerated ? colorGeneratedDescription : colorDescription,
} )`
	color: ${ props => props.color };
	cursor: pointer;
	position: relative;
	max-width: ${ MAX_WIDTH }px;
	font-size: 13px;
`;

const MobileDescription = styled( DesktopDescription )`
`;

const MobileDescriptionOverflowContainer = styled( MobileDescription )`
	font-size: 14px;
	line-height: 20px;
	max-height: 80px; // max four lines of text
	overflow: hidden;
	text-overflow: ellipsis;
`;

const MobilePartContainer = styled.div`
	padding: 8px 16px;
`;

const DesktopPartContainer = styled.div`
`;

export const UrlDownArrow = styled.div`
	display: inline-block;
	margin-top: 6px;
	margin-left: 6px;
	border-top: 5px solid #006621;
	border-right: 4px solid transparent;
	border-left: 4px solid transparent;
	vertical-align: top;
`;

const DatePreview = styled.span`
	color: ${ colorDate };
`;

const Separator = styled.hr`
	border: 0;
	border-bottom: 1px solid #DFE1E5;
	margin: 0;
`;

const ampLogo = "data:image/png;base64," +
	"iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAQAAABLCVATAAABr0lEQVR4AbWWJYCUURhFD04Z" +
	"i7hrLzgFd4nzV9x6wKHinmYb7g4zq71gIw2LWBnZ3Q8df/fh96Tn/t2HVIw4CVKk+fSFNCkS" +
	"xInxW1pFkhLmoMRjVvFLmkEX5ocuZuBVPw5jv8hh+iEU5QEmuMK+prz7RN3dPMMEGQYzxpH/" +
	"lGjzou5jgl7mAvOdZfcbF+jbm3MAbFZ7VX9SJnlL1D8UMyjLe+BrAYDb+jJUr59JrlNWRtcq" +
	"X9GkrPCR4QBAf4qYJAkQoyQrbKKs8RiaEjEI0GvvQ1mLMC9xaBFFBaZS1TbMSwJSomg39erD" +
	"F+TxpCCNOXjGQJTCvG6qn4ZPzkcxA61Tjhaf4KMj+6Q3XvW6Lopraa8IozRQxIi0a7NXorUL" +
	"c5JyHX/3F3q+0PsFYytVTaGgjz/AvCyiegE69IUsPxHNBMpa738i6tGWlzkAABjKe/+j9YeR" +
	"HGVd9oWRnwe2ewDASp/L/UqoPQ5AmFeYZMavBP8dAJz0GWWDHQlzXApMdz4KYUfKICcxkKeO" +
	"fGmQyrIPcgE9m+g/+kT812/Nr3+0kqzitxQjoKXh6xfor99nlEdFjyvH15gAAAAASUVORK5C" +
	"YII=";

const Amp = styled.div`
	background-size: 100% 100%;
	display: inline-block;
	height: 12px;
	width: 12px;
	margin-bottom: -1px;
	opacity: 0.46;
	margin-right: 6px;
	background-image: url( ${ ampLogo } )
`;

/**
 * Highlights a keyword with strong React elements.
 *
 * @param {string} locale ISO 639 (2/3 characters) locale.
 * @param {string} keyword The keyword.
 * @param {string} text The text in which to highlight a keyword.
 * @param {string} cleanText Optional. The text in which to highlight a keyword
 *                           without special characters and diacritics.
 *
 * @returns {ReactElement} React elements to be rendered.
 */
function highlightKeyword( locale, keyword, text, cleanText ) {
	if ( ! keyword ) {
		return text;
	}

	/*
	 * When a text has been cleaned up from special characters and diacritics
	 * we need to match against a cleaned up keyword as well.
	 */
	const textToUse = cleanText ? cleanText : text;
	const keywordToUse = cleanText ? replaceSpecialCharactersAndDiacritics( keyword ) : keyword;

	// Match keyword case-insensitively.
	const keywordMatcher = createWordRegex( keywordToUse, "", false );

	text = textToUse.replace( keywordMatcher, function( keywordToUse ) {
		return `{{strong}}${ keywordToUse }{{/strong}}`;
	} );

	// Transliterate the keyword for highlighting
	const transliteratedKeyword = transliterate( keyword, locale );
	if ( transliteratedKeyword !== keyword ) {
		const transliteratedKeywordMatcher = createWordRegex( transliteratedKeyword, "", false );
		// Let the transliteration run on the text with no previous replacements.
		text = text.replace( transliteratedKeywordMatcher, function( keyword ) {
			return `{{strong}}${ keyword }{{/strong}}`;
		} );
	}

	return interpolateComponents( {
		mixedString: text,
		components: { strong: <strong /> },
	} );
}

/**
 * Returns if a url has a trailing slash or not.
 *
 * @param {string} url The url to check for a trailing slash.
 * @returns {boolean} Whether or not the url contains a trailing slash.
 */
function hasTrailingSlash( url ) {
	return url.lastIndexOf( "/" ) === ( url.length - 1 );
}

export default class SnippetPreview extends PureComponent {
	/**
	 * Renders the SnippetPreview component.
	 *
	 * @param {Object} props The passed props.
	 * @param {string} props.title                  The title tag.
	 * @param {string} props.url                    The URL of the page for which to generate a snippet.
	 * @param {string} props.description            The meta description.
	 * @param {string} props.keyword                The keyword for the page.
	 * @param {string} props.isDescriptionGenerated Whether the description was generated.
	 * @param {string} props.locale                 The locale of the page.
	 * @param {string} props.date                   Optional, the date to display before the meta description.
	 *
	 * @returns {ReactElement} The SnippetPreview component.
	 */
	constructor( props ) {
		super( props );

		this.state = {
			title: props.title,
			description: props.description,
		};

		this.setTitleRef       = this.setTitleRef.bind( this );
		this.setDescriptionRef = this.setDescriptionRef.bind( this );
	}

	/**
	 * Sets the title element reference for later use.
	 *
	 * @param {Object} titleElement The title element.
	 *
	 * @returns {void}
	 */
	setTitleRef( titleElement ) {
		this._titleElement = titleElement;
	}

	/**
	 * Sets the description element reference for later use.
	 *
	 * @param {Object} descriptionElement The description element.
	 *
	 * @returns {void}
	 */
	setDescriptionRef( descriptionElement ) {
		this._descriptionElement = descriptionElement;
	}

	/**
	 * Returns whether an element has content that doesn't fit.
	 *
	 * Has a leeway of 2 to make sure weird measurements don't cause an infinite
	 * loop.
	 *
	 * @param {HTMLElement} element The element to check.
	 *
	 * @returns {boolean} Whether it has content that doesn't fit.
	 */
	hasOverflowedContent( element ) {
		return Math.abs( element.clientHeight - element.scrollHeight ) >= 2;
	}

	/**
	 * Set the title in the state so it fits in two lines.
	 *
	 * @returns {void}
	 */
	fitTitle() {
		const titleElement = this._titleElement;

		/*
		 * When the title is 600 pixels in width and two lines it approximately fits 200
		 * characters. Because we need to translate the pixels (current width) to the
		 * amount of characters we need a ratio. That ratio is 600/200 = 3.
		 */
		const PIXELS_PER_CHARACTER_FOR_TWO_LINES = 3;

		if ( this.hasOverflowedContent( titleElement ) ) {
			let prevTitle = this.state.title;

			// Heuristic to prevent too many re-renders.
			const maxCharacterCount = titleElement.clientWidth / PIXELS_PER_CHARACTER_FOR_TWO_LINES;

			if ( prevTitle.length > maxCharacterCount ) {
				prevTitle = prevTitle.substring( 0, maxCharacterCount );
			}

			const newTitle = this.dropLastWord( prevTitle );

			this.setState( {
				title: newTitle,
			} );
		}
	}

	/**
	 * Set the description in the state so it fits in four lines.
	 *
	 * @returns {void}
	 */
	fitDescription() {
		const descriptionElement = this._descriptionElement;

		/*
		 * See the logic for TWO_LINES_OF_CHARACTERS_PER_WIDTH. We've determined that
		 * 1.75 is a good amount as a heuristic.
		 */
		const PIXELS_PER_CHARACTER_FOR_FOUR_LINES = 1.75;

		if ( this.hasOverflowedContent( descriptionElement ) ) {
			let prevDescription = this.state.description;

			// Heuristic to prevent too many re-renders.
			const maxCharacterCount = descriptionElement.clientWidth / PIXELS_PER_CHARACTER_FOR_FOUR_LINES;

			if ( prevDescription.length > maxCharacterCount ) {
				prevDescription = prevDescription.substring( 0, maxCharacterCount );
			}

			const newDescription = this.dropLastWord( prevDescription );

			this.setState( {
				description: newDescription,
			} );
		}
	}

	/**
	 * Removes the last word of a sentence.
	 *
	 * @param {string} sentence The sentence to drop a word of.
	 * @returns {string} The new sentence.
	 */
	dropLastWord( sentence ) {
		let titleParts = sentence.split( " " );
		titleParts.pop();

		return titleParts.join( " " );
	}

	/**
	 * Returns the title for rendering.
	 *
	 * @returns {string} The title to render.
	 */
	getTitle() {
		if ( this.props.title !== this.state.title ) {
			return this.state.title + " ...";
		}

		return this.props.title;
	}

	/**
	 * Returns the description for rendering.
	 *
	 * @returns {string} The description to render.
	 */
	getDescription() {
		if ( ! this.props.description && this.props.descriptionPlaceholder ) {
			return this.props.descriptionPlaceholder;
		}

		if ( this.props.mode === MODE_MOBILE && this.props.description !== this.state.description ) {
			return this.state.description + " ...";
		}

		if ( this.props.mode === MODE_DESKTOP ) {
			return truncate( this.props.description, {
				length: DESCRIPTION_LIMIT,
				omission: "",
			} );
		}

		return this.props.description;
	}

	/**
	 * Renders the date if set.
	 *
	 * @returns {?ReactElement} The rendered date.
	 */
	renderDate() {
		return this.props.date === ""
			? null
			: <DatePreview>{ this.props.date } - </DatePreview>;
	}

	/**
	 * Adds caret styles to the base component if relevant prop is active.
	 *
	 * @param {string} fieldName The field to add caret styles to.
	 * @param {ReactComponent} BaseComponent The base component for the field.
	 *
	 * @returns {ReactComponent} The component with caret styles added.
	 */
	addCaretStyles( fieldName, BaseComponent ) {
		const {
			mode,
			hoveredField,
			activeField,
		} = this.props;

		if ( activeField === fieldName ) {
			return addCaretStyle( BaseComponent, colors.$color_snippet_active, mode );
		}

		if ( hoveredField === fieldName ) {
			return addCaretStyle( BaseComponent, colors.$color_snippet_hover, mode );
		}

		return BaseComponent;
	}

	/**
	 * Returns the breadcrumbs string to be rendered.
	 *
	 * @param {string} url The url to use to build the breadcrumbs.
	 * @returns {string} The breadcrumbs.
	 */
	getBreadcrumbs( url ) {
		const { breadcrumbs } = this.props;
		/*
		 * Strip out question mark and hash characters from the raw URL and percent-encode
		 * characters that are not allowed in a URI.
		 */
		const cleanEncodedUrl = encodeURI( url.replace( /\?|#/g, "" ) );

		const { protocol, hostname, pathname } = parse( cleanEncodedUrl );

		const hostPart = protocol === "https:" ? protocol + "//" + hostname : hostname;

		const urlParts = breadcrumbs || pathname.split( "/" );

		const breadCrumbs = [ hostPart, ...urlParts ].filter( part => !! part ).join( " › " );

		return decodeURI( breadCrumbs );
	}

	/**
	 * Renders the URL for display in the snippet preview.
	 *
	 * @returns {ReactElement} The rendered URL.
	 */
	renderUrl() {
		const {
			url,
			onClick,
			onMouseOver,
			onMouseLeave,
		} = this.props;

		/*
		 * We need to replace special characters and diacritics only on the url
		 * string because when highlightKeyword kicks in, interpolateComponents
		 * returns an array of strings plus a strong React element, and replace()
		 * can't run on an array.
		 */
		let urlContent = replaceSpecialCharactersAndDiacritics( url );

		if ( this.props.mode === MODE_MOBILE ) {
			urlContent = this.getBreadcrumbs( urlContent );
		} else {
			if ( ! hasTrailingSlash( urlContent ) ) {
				urlContent = urlContent + "/";
			}
		}

		const Url = this.addCaretStyles( "url", BaseUrl );
		/*
		 * The jsx-a11y eslint plugin is asking for an onFocus accompanying the onMouseOver.
		 * However this is not relevant in this case, because the url is not focusable.
		 */
		/* eslint-disable jsx-a11y/mouse-events-have-key-events */
		return <Url>
			<BaseUrlOverflowContainer
				onClick={ onClick.bind( null, "url" ) }
				onMouseOver={ partial( onMouseOver, "url" ) }
				onMouseLeave={ partial( onMouseLeave, "url" ) }>
				{ urlContent }
			</BaseUrlOverflowContainer>
		</Url>;
		/* eslint-enable jsx-a11y/mouse-events-have-key-events */
	}

	/**
	 * Before we receive props we need to set the title and description in the
	 * state.
	 *
	 * @param {Object} nextProps The props this component will receive.
	 *
	 * @returns {void}
	 */
	componentWillReceiveProps( nextProps ) {
		const nextState = {};

		if ( this.props.title !== nextProps.title ) {
			nextState.title = nextProps.title;
		}

		if ( this.props.description !== nextProps.description ) {
			nextState.description = nextProps.description;
		}

		this.setState( nextState );
	}

	/**
	 * After a component updates we need to fit the title.
	 *
	 * @returns {void}
	 */
	componentDidUpdate() {
		if ( this.props.mode === MODE_MOBILE ) {
			clearTimeout( this.fitTitleTimeout );

			// Make sure that fitting the title doesn't block other rendering.
			this.fitTitleTimeout = setTimeout( () => {
				this.fitTitle();
				this.fitDescription();
			}, 10 );
		}
	}

	/**
	 * Renders the snippet preview description, based on the mode.
	 *
	 * @returns {ReactElement} The rendered description.
	 */
	renderDescription() {
		const {
			keyword,
			isDescriptionGenerated,
			locale,
			onClick,
			onMouseLeave,
			onMouseOver,
			mode,
		} = this.props;

		const renderedDate = this.renderDate();

		const outerContainerProps = {
			isDescriptionGenerated: isDescriptionGenerated,
			onClick: onClick.bind( null, "description" ),
			onMouseOver: partial( onMouseOver, "description" ),
			onMouseLeave: partial( onMouseLeave, "description" ),
		};

		if ( mode === MODE_DESKTOP ) {
			const DesktopDescriptionWithCaret = this.addCaretStyles( "description", DesktopDescription );
			return (
				<DesktopDescriptionWithCaret
					{ ...outerContainerProps }
					innerRef={ this.setDescriptionRef }
				>
					{ renderedDate }
					{ highlightKeyword( locale, keyword, this.getDescription() ) }
				</DesktopDescriptionWithCaret>
			);
		} else if ( mode === MODE_MOBILE ) {
			const MobileDescriptionWithCaret = this.addCaretStyles( "description", MobileDescription );
			return (
				<MobileDescriptionWithCaret
					{ ...outerContainerProps }
				>
					<MobileDescriptionOverflowContainer
						innerRef={ this.setDescriptionRef }
					>
						{ renderedDate }
						{ highlightKeyword( locale, keyword, this.getDescription() ) }
					</MobileDescriptionOverflowContainer>
				</MobileDescriptionWithCaret>
			);
		}
		return null;
	}

	/**
	 * Renders the snippet preview.
	 *
	 * @returns {ReactElement} The rendered snippet preview.
	 */
	render() {
		const {
			onClick,
			onMouseLeave,
			onMouseOver,
			mode,
			isAmp,
		} = this.props;

		const {
			PartContainer,
			Container,
			TitleUnbounded,
			Title,
		} = this.getPreparedComponents( mode );

		const separator = mode === MODE_DESKTOP ? null : <Separator/>;
		const downArrow = mode === MODE_DESKTOP ? <UrlDownArrow/> : null;
		const amp       = mode === MODE_DESKTOP || ! isAmp ? null : <Amp/>;

		const helpText = [ __( "This is a rendering of what this post might look like in Google's search results. ", "yoast-components" ),
			<a key="1" href="https://yoa.st/snippet-preview" rel="noopener noreferrer" target="_blank">
				{ __( "Learn more about the Snippet Preview.", "yoast-components" ) }
			</a> ];

		/*
		 * The jsx-a11y eslint plugin is asking for an onFocus accompanying the onMouseOver.
		 * However this is not relevant in this case, because the title and description are
		 * not focusable.
		 */
		/* eslint-disable jsx-a11y/mouse-events-have-key-events */
		return (
			<section>
				<div>
					<HelpTextWrapper helpText={ helpText } />
				</div>
				<Container
					onMouseLeave={ this.onMouseLeave }
					width={ MAX_WIDTH + 2 * WIDTH_PADDING }
					padding={ WIDTH_PADDING }
				>
					<PartContainer>
						<FormattedScreenReaderMessage
							id="snippetPreview.seoTitlePreview"
							defaultMessage="SEO title preview"
							after=":"
						/>
						<Title
							onClick={ onClick.bind( null, "title" ) }
							onMouseOver={ partial( onMouseOver, "title" ) }
							onMouseLeave={ partial( onMouseLeave, "title" ) }
						>
							<TitleBounded>
								<TitleUnbounded innerRef={ this.setTitleRef } >
									{ this.getTitle() }
								</TitleUnbounded>
							</TitleBounded>
						</Title>
						<FormattedScreenReaderMessage
							id="snippetPreview.urlPreview"
							defaultMessage="Url preview"
							after=":"
						/>
						{ amp }
						{ this.renderUrl() }
						{ downArrow }
					</PartContainer>
					{ separator }
					<PartContainer>
						<FormattedScreenReaderMessage
							id="snippetPreview.metaDescriptionPreview"
							defaultMessage="Meta description preview"
							after=":"
						/>
						{ this.renderDescription() }
					</PartContainer>
				</Container>
			</section>
		);
	/* eslint-enable jsx-a11y/mouse-events-have-key-events */
	}

	/**
	 * Returns the prepared components based on the mode we are currently in.
	 *
	 * @param {string} mode The mode we are in.
	 * @returns {{
	 *     PartContainer: ReactComponent,
	 *     Container: ReactComponent,
	 *     TitleUnbounded: ReactComponent,
	 *     Title: ReactComponent,
	 * }} The prepared components.
	 */
	getPreparedComponents( mode ) {
		const PartContainer = mode === MODE_DESKTOP ? DesktopPartContainer : MobilePartContainer;
		const Container = mode === MODE_DESKTOP ? DesktopContainer : MobileContainer;
		const TitleUnbounded = mode === MODE_DESKTOP ? TitleUnboundedDesktop : TitleUnboundedMobile;
		const Title = this.addCaretStyles( "title", BaseTitle );

		return {
			PartContainer,
			Container,
			TitleUnbounded,
			Title,
		};
	}
}

SnippetPreview.propTypes = {
	title: PropTypes.string.isRequired,
	url: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
	descriptionPlaceholder: PropTypes.string,
	date: PropTypes.string,
	breadcrumbs: PropTypes.array,

	hoveredField: PropTypes.string,
	activeField: PropTypes.string,
	keyword: PropTypes.string,
	isDescriptionGenerated: PropTypes.bool,
	locale: PropTypes.string,
	mode: PropTypes.oneOf( MODES ),
	isAmp: PropTypes.bool,
	helpText: PropTypes.string,

	onClick: PropTypes.func.isRequired,
	onHover: PropTypes.func,
	onMouseOver: PropTypes.func,
	onMouseLeave: PropTypes.func,
};

SnippetPreview.defaultProps = {
	date: "",
	keyword: "",
	breadcrumbs: null,
	isDescriptionGenerated: false,
	locale: "en",
	hoveredField: "",
	activeField: "",
	mode: DEFAULT_MODE,
	isAmp: false,

	onHover: () => {},
	onMouseOver: () => {},
	onMouseLeave: () => {},
};
